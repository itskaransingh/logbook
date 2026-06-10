-- Admin-to-admin visibility + planned-for dates on tasks.
--
-- 1) Admins may now see ALL users' rows (employees and other admins).
--    Every RLS policy delegates to can_view_user() by name, so replacing
--    the function body is sufficient — no policies need recreating. The
--    tasks INSERT policy therefore also starts allowing admin→admin task
--    assignment, which is intended.
create or replace function public.can_view_user(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target = auth.uid() or public.is_admin();
$$;

-- 2) Tasks get a planned-for date so a "plan of action for tomorrow" can
--    be written at clock-out without showing up in today's list. Clients
--    always send their local YYYY-MM-DD (src/lib/dates.ts); the UTC-based
--    column default is a fallback only.
alter table public.tasks
  add column planned_for date not null default current_date;

-- Backfill: best available approximation is the (UTC) creation date.
update public.tasks set planned_for = created_at::date;

create index tasks_user_planned_idx on public.tasks(user_id, planned_for);
