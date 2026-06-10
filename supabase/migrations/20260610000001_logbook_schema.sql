-- Logbook schema: roles, work sessions, breaks, hourly updates, tasks
-- Visibility model: employees see only their own rows; admins see employees'
-- rows; admin rows are invisible to everyone else (including other admins).

-- ============================================================
-- Roles
-- ============================================================

alter table public.profiles
  add column role text not null default 'employee'
    check (role in ('admin', 'employee'));

create index if not exists profiles_role_idx on public.profiles(role);

-- SECURITY DEFINER so policies on profiles can reference profiles
-- without infinite RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Single source of truth for "may the caller see this user's rows?":
-- own rows always; admins may see employees only.
create or replace function public.can_view_user(target uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select target = auth.uid()
      or (
        public.is_admin()
        and exists (
          select 1 from profiles
          where id = target and role = 'employee'
        )
      );
$$;

-- Profiles: replace owner-only visibility with the shared rule and
-- tighten the template's overly broad grants.
drop policy "Users can view own profile" on public.profiles;

create policy "Users can view permitted profiles"
  on public.profiles for select
  using ( public.can_view_user(id) );

revoke all on public.profiles from anon;

-- ============================================================
-- Work sessions (one per user per day) + breaks
-- ============================================================

create table public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null default current_date,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create table public.session_breaks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.work_sessions(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- At most one open break per session.
create unique index session_breaks_one_open_idx
  on public.session_breaks(session_id)
  where ended_at is null;

alter table public.work_sessions enable row level security;
alter table public.session_breaks enable row level security;

create policy "View permitted work sessions"
  on public.work_sessions for select
  using ( public.can_view_user(user_id) );

-- The +/- 1 day window tolerates client-local vs server-UTC date skew
-- around midnight; clients always write their local date.
create policy "Insert own current work session"
  on public.work_sessions for insert
  with check (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  );

create policy "Update own current work session"
  on public.work_sessions for update
  using (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  )
  with check (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  );

create policy "View permitted session breaks"
  on public.session_breaks for select
  using (
    exists (
      select 1 from public.work_sessions ws
      where ws.id = session_id and public.can_view_user(ws.user_id)
    )
  );

create policy "Insert breaks on own current session"
  on public.session_breaks for insert
  with check (
    exists (
      select 1 from public.work_sessions ws
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and ws.work_date between current_date - 1 and current_date + 1
    )
  );

create policy "Update breaks on own current session"
  on public.session_breaks for update
  using (
    exists (
      select 1 from public.work_sessions ws
      where ws.id = session_id
        and ws.user_id = auth.uid()
        and ws.work_date between current_date - 1 and current_date + 1
    )
  );

drop trigger if exists handle_work_sessions_updated_at on public.work_sessions;
create trigger handle_work_sessions_updated_at
  before update on public.work_sessions
  for each row execute procedure public.handle_updated_at();

-- Closing timestamps must come from the server; supabase-js cannot send
-- SQL now() in an update payload, so these RPCs do it. SECURITY INVOKER:
-- the caller's RLS still applies to the inner updates.
create or replace function public.end_break(p_session_id uuid)
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  update session_breaks
    set ended_at = now()
    where session_id = p_session_id and ended_at is null;
  update work_sessions
    set status = 'active'
    where id = p_session_id and status = 'paused';
end;
$$;

create or replace function public.clock_out(p_session_id uuid)
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  update session_breaks
    set ended_at = now()
    where session_id = p_session_id and ended_at is null;
  update work_sessions
    set clock_out_at = now(), status = 'completed'
    where id = p_session_id and status in ('active', 'paused');
end;
$$;

-- Durations computed in SQL so daily/weekly totals are one query.
-- security_invoker makes the view respect the tables' RLS.
create view public.session_summaries
with (security_invoker = true) as
select
  ws.id,
  ws.user_id,
  ws.work_date,
  ws.clock_in_at,
  ws.clock_out_at,
  ws.status,
  extract(epoch from (coalesce(ws.clock_out_at, now()) - ws.clock_in_at))::int
    as total_seconds,
  coalesce((
    select sum(extract(epoch from (coalesce(b.ended_at, now()) - b.started_at)))::int
    from public.session_breaks b
    where b.session_id = ws.id
  ), 0) as break_seconds
from public.work_sessions ws;

-- ============================================================
-- Hourly updates
-- ============================================================

create table public.hourly_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null default current_date,
  hour smallint not null check (hour between 0 and 23),
  content text not null check (char_length(content) <= 1000),
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date, hour)
);

alter table public.hourly_updates enable row level security;

create policy "View permitted hourly updates"
  on public.hourly_updates for select
  using ( public.can_view_user(user_id) );

create policy "Insert own current hourly updates"
  on public.hourly_updates for insert
  with check (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  );

-- Same-day-only edits, enforced server-side.
create policy "Update own current hourly updates"
  on public.hourly_updates for update
  using (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  )
  with check (
    auth.uid() = user_id
    and work_date between current_date - 1 and current_date + 1
  );

create or replace function public.handle_hourly_update_edited()
returns trigger as $$
begin
  new.is_edited = true;
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_hourly_updates_edited on public.hourly_updates;
create trigger handle_hourly_updates_edited
  before update on public.hourly_updates
  for each row execute procedure public.handle_hourly_update_edited();

-- ============================================================
-- Tasks
-- ============================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "View permitted tasks"
  on public.tasks for select
  using ( public.can_view_user(user_id) );

-- Self-created tasks for everyone; admins may also assign to employees.
-- Employees cannot assign to anyone else.
create policy "Create permitted tasks"
  on public.tasks for insert
  with check (
    created_by = auth.uid()
    and public.can_view_user(user_id)
  );

create policy "Update permitted tasks"
  on public.tasks for update
  using ( public.can_view_user(user_id) )
  with check ( public.can_view_user(user_id) );

create policy "Delete own or created tasks"
  on public.tasks for delete
  using ( auth.uid() = user_id or auth.uid() = created_by );

-- completed_at is set/cleared by the server on status flips,
-- never by the client.
create or replace function public.handle_task_status_change()
returns trigger as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_tasks_status_change on public.tasks;
create trigger handle_tasks_status_change
  before update on public.tasks
  for each row execute procedure public.handle_task_status_change();

-- ============================================================
-- Grants and indexes
-- ============================================================

revoke all on public.work_sessions from anon;
revoke all on public.session_breaks from anon;
revoke all on public.hourly_updates from anon;
revoke all on public.tasks from anon;
revoke all on public.session_summaries from anon;

grant select, insert, update on public.work_sessions to authenticated;
grant select, insert, update on public.session_breaks to authenticated;
grant select, insert, update on public.hourly_updates to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.session_summaries to authenticated;
grant execute on function public.end_break(uuid) to authenticated;
grant execute on function public.clock_out(uuid) to authenticated;
revoke execute on function public.end_break(uuid) from anon;
revoke execute on function public.clock_out(uuid) from anon;

create index work_sessions_user_date_idx on public.work_sessions(user_id, work_date);
create index session_breaks_session_idx on public.session_breaks(session_id);
create index hourly_updates_user_date_idx on public.hourly_updates(user_id, work_date);
create index tasks_user_status_idx on public.tasks(user_id, status);
