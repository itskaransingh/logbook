-- Logbook optimisation: super_admin role, admin-employee assignment, departments,
-- task approval flow, day wraps, and activity feed.

-- ============================================================
-- 1. Profiles: super_admin role, department, admin assignment
-- ============================================================

-- Extend role check (auto-named constraint; IF EXISTS is safe if name differs)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'employee', 'super_admin'));

ALTER TABLE public.profiles
  ADD COLUMN department text,
  ADD COLUMN assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Super admin can toggle their own work data visible to regular admins
  ADD COLUMN show_work_to_admins boolean NOT NULL DEFAULT false;

CREATE INDEX profiles_assigned_admin_idx ON public.profiles(assigned_admin_id);

-- ============================================================
-- 2. Updated helper functions
-- ============================================================

-- is_admin() now returns true for both 'admin' and 'super_admin' so
-- existing policies (task_comments, admin_resume_session, etc.) work unchanged.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Visibility rules:
--   • Everyone sees themselves.
--   • Super admin sees everyone.
--   • Regular admin sees employees assigned to them (assigned_admin_id = caller),
--     or unassigned employees (backwards-compat during rollout).
--   • Regular admin sees super admin only if show_work_to_admins = true.
CREATE OR REPLACE FUNCTION public.can_view_user(target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target = auth.uid()

    OR public.is_super_admin()

    OR (
      -- Regular admin sees their assigned employees (or unassigned ones during rollout)
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = target
          AND role = 'employee'
          AND (assigned_admin_id = auth.uid() OR assigned_admin_id IS NULL)
      )
    )

    OR (
      -- Regular admin sees super admin if they opted in
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = target
          AND role = 'super_admin'
          AND show_work_to_admins = true
      )
    );
$$;

-- ============================================================
-- 3. Profile policies: super admin can update any profile
-- ============================================================

CREATE POLICY "Super admin can update any profile"
  ON public.profiles FOR UPDATE
  USING ( public.is_super_admin() )
  WITH CHECK ( public.is_super_admin() );

-- ============================================================
-- 4. Tasks: new statuses + optional additional approver
-- ============================================================

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_approval', 'approved', 'needs_changes', 'done'));

ALTER TABLE public.tasks
  ADD COLUMN additional_approver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Migrate existing 'done' rows to 'approved' (new canonical completed status)
UPDATE public.tasks SET status = 'approved' WHERE status = 'done';

-- Updated trigger: set/clear completed_at on approved (or legacy done)
CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS trigger AS $$
BEGIN
  IF new.status IN ('approved', 'done') AND old.status NOT IN ('approved', 'done') THEN
    new.completed_at = now();
  ELSIF new.status NOT IN ('approved', 'done') THEN
    new.completed_at = null;
  END IF;
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Day wraps table
-- ============================================================

CREATE TABLE public.day_wraps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  wrapped_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved')),
  UNIQUE (user_id, work_date)
);

CREATE INDEX day_wraps_user_date_idx ON public.day_wraps(user_id, work_date);

ALTER TABLE public.day_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View permitted day wraps"
  ON public.day_wraps FOR SELECT
  USING ( public.can_view_user(user_id) );

REVOKE ALL ON public.day_wraps FROM anon;
GRANT SELECT ON public.day_wraps TO authenticated;
-- INSERT/UPDATE only via SECURITY DEFINER RPCs; no direct client writes

-- ============================================================
-- 6. Activity feed table
-- ============================================================

CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('task_approved', 'day_wrapped')),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_feed_created_at_idx ON public.activity_feed(created_at DESC);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- All authenticated users see the full feed
CREATE POLICY "View activity feed"
  ON public.activity_feed FOR SELECT
  USING ( auth.role() = 'authenticated' );

REVOKE ALL ON public.activity_feed FROM anon;
GRANT SELECT ON public.activity_feed TO authenticated;
-- No INSERT grant for authenticated; only SECURITY DEFINER functions can insert

-- ============================================================
-- 7. RPCs
-- ============================================================

-- wrap_up_day(): employee wraps their own day.
-- Validates all today's tasks are approved, auto-clocks-out, creates day_wrap.
CREATE OR REPLACE FUNCTION public.wrap_up_day()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_today     date := current_date;
  v_task_count      int;
  v_non_approved    int;
  v_wrap_id   uuid;
BEGIN
  SELECT count(*) INTO v_task_count
  FROM tasks
  WHERE user_id = v_user_id AND planned_for = v_today;

  IF v_task_count = 0 THEN
    RAISE EXCEPTION 'No tasks for today — use regular clock-out instead.';
  END IF;

  SELECT count(*) INTO v_non_approved
  FROM tasks
  WHERE user_id = v_user_id
    AND planned_for = v_today
    AND status != 'approved';

  IF v_non_approved > 0 THEN
    RAISE EXCEPTION '% task(s) are not yet approved.', v_non_approved;
  END IF;

  -- Close open breaks
  UPDATE session_breaks
    SET ended_at = now()
    WHERE session_id IN (
      SELECT id FROM work_sessions
      WHERE user_id = v_user_id AND work_date = v_today AND status IN ('active', 'paused')
    ) AND ended_at IS NULL;

  -- Clock out active sessions
  UPDATE work_sessions
    SET clock_out_at = now(), status = 'completed'
    WHERE user_id = v_user_id AND work_date = v_today AND status IN ('active', 'paused');

  -- Create day wrap (idempotent)
  INSERT INTO day_wraps (user_id, work_date)
  VALUES (v_user_id, v_today)
  ON CONFLICT (user_id, work_date) DO NOTHING
  RETURNING id INTO v_wrap_id;

  IF v_wrap_id IS NULL THEN
    SELECT id INTO v_wrap_id FROM day_wraps WHERE user_id = v_user_id AND work_date = v_today;
  END IF;

  RETURN json_build_object('id', v_wrap_id, 'work_date', v_today, 'status', 'pending');
END;
$$;

-- approve_task(): admin approves a pending_approval task.
-- Authorized callers: employee's assigned_admin, task's additional_approver, super_admin.
CREATE OR REPLACE FUNCTION public.approve_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task          tasks%ROWTYPE;
  v_employee      profiles%ROWTYPE;
  v_approver_name text;
  v_employee_name text;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.status != 'pending_approval' THEN RAISE EXCEPTION 'Task is not pending approval'; END IF;

  SELECT * INTO v_employee FROM profiles WHERE id = v_task.user_id;

  IF NOT (
    public.is_super_admin()
    OR v_employee.assigned_admin_id = auth.uid()
    OR v_task.additional_approver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve this task';
  END IF;

  UPDATE tasks SET status = 'approved' WHERE id = p_task_id;

  SELECT full_name INTO v_approver_name FROM profiles WHERE id = auth.uid();
  SELECT full_name INTO v_employee_name FROM profiles WHERE id = v_task.user_id;

  INSERT INTO activity_feed (type, actor_id, subject_id, task_id, content)
  VALUES (
    'task_approved',
    auth.uid(),
    v_task.user_id,
    p_task_id,
    coalesce(v_approver_name, 'Admin') || ' approved ' ||
    coalesce(v_employee_name, 'an employee') || '''s task: ' || v_task.title
  );

  RETURN json_build_object('success', true, 'task_id', p_task_id);
END;
$$;

-- request_task_changes(): admin requests changes, task → needs_changes + comment inserted.
CREATE OR REPLACE FUNCTION public.request_task_changes(p_task_id uuid, p_comment text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task     tasks%ROWTYPE;
  v_employee profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.status != 'pending_approval' THEN RAISE EXCEPTION 'Task is not pending approval'; END IF;

  SELECT * INTO v_employee FROM profiles WHERE id = v_task.user_id;

  IF NOT (
    public.is_super_admin()
    OR v_employee.assigned_admin_id = auth.uid()
    OR v_task.additional_approver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to request changes on this task';
  END IF;

  UPDATE tasks SET status = 'needs_changes' WHERE id = p_task_id;

  IF p_comment IS NOT NULL AND char_length(trim(p_comment)) > 0 THEN
    INSERT INTO task_comments (task_id, user_id, content)
    VALUES (p_task_id, auth.uid(), trim(p_comment));
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- approve_day_wrap(): admin approves an employee's day wrap.
CREATE OR REPLACE FUNCTION public.approve_day_wrap(p_wrap_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wrap          day_wraps%ROWTYPE;
  v_employee      profiles%ROWTYPE;
  v_approver_name text;
  v_employee_name text;
BEGIN
  SELECT * INTO v_wrap FROM day_wraps WHERE id = p_wrap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Day wrap not found'; END IF;
  IF v_wrap.status != 'pending' THEN RAISE EXCEPTION 'Day wrap is not pending approval'; END IF;

  SELECT * INTO v_employee FROM profiles WHERE id = v_wrap.user_id;

  IF NOT (
    public.is_super_admin()
    OR v_employee.assigned_admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve this day wrap';
  END IF;

  UPDATE day_wraps
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_wrap_id;

  SELECT full_name INTO v_approver_name FROM profiles WHERE id = auth.uid();
  SELECT full_name INTO v_employee_name FROM profiles WHERE id = v_wrap.user_id;

  INSERT INTO activity_feed (type, actor_id, subject_id, content)
  VALUES (
    'day_wrapped',
    auth.uid(),
    v_wrap.user_id,
    coalesce(v_employee_name, 'An employee') || ' wrapped up the day. Approved by ' ||
    coalesce(v_approver_name, 'Co-Founder') || '.'
  );

  RETURN json_build_object('success', true, 'wrap_id', p_wrap_id);
END;
$$;

-- ============================================================
-- 8. RPC grants
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wrap_up_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_task_changes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_day_wrap(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.wrap_up_day() FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_task(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_task_changes(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_day_wrap(uuid) FROM anon;
