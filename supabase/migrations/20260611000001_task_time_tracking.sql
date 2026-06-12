-- Task time estimation, time tracking entries, user status/presence,
-- and admin session resume.

-- ============================================================
-- Tasks: estimated time + overtime reason
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN estimated_minutes smallint CHECK (estimated_minutes > 0),
  ADD COLUMN overtime_reason text CHECK (char_length(overtime_reason) <= 500);

-- ============================================================
-- Task time entries (start / stop intervals per task)
-- ============================================================

CREATE TABLE public.task_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- At most one running (open) entry per task at a time.
CREATE UNIQUE INDEX task_time_entries_one_running_idx
  ON public.task_time_entries(task_id)
  WHERE stopped_at IS NULL;

CREATE INDEX task_time_entries_user_idx
  ON public.task_time_entries(user_id);

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View permitted task time entries"
  ON public.task_time_entries FOR SELECT
  USING ( public.can_view_user(user_id) );

CREATE POLICY "Insert own task time entries"
  ON public.task_time_entries FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Update own task time entries"
  ON public.task_time_entries FOR UPDATE
  USING ( auth.uid() = user_id );

REVOKE ALL ON public.task_time_entries FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.task_time_entries TO authenticated;

-- Server-side stop: sets stopped_at = now() so client can't fake timestamps.
CREATE OR REPLACE FUNCTION public.stop_task_timer(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE task_time_entries
    SET stopped_at = now()
    WHERE task_id = p_task_id
      AND stopped_at IS NULL
      AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.stop_task_timer(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.stop_task_timer(uuid) FROM anon;

-- ============================================================
-- User status / presence (Slack-like)
-- ============================================================

CREATE TABLE public.user_status (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🟢',
  label text NOT NULL DEFAULT 'Working'
    CHECK (char_length(label) <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View permitted user status"
  ON public.user_status FOR SELECT
  USING ( public.can_view_user(user_id) );

CREATE POLICY "Upsert own user status"
  ON public.user_status FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Update own user status"
  ON public.user_status FOR UPDATE
  USING ( auth.uid() = user_id );

REVOKE ALL ON public.user_status FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_status TO authenticated;

-- ============================================================
-- Admin: resume a completed session for an employee
-- ============================================================

-- SECURITY DEFINER so the admin can update another user's session
-- (the normal RLS update policy restricts to auth.uid() = user_id).
CREATE OR REPLACE FUNCTION public.admin_resume_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can resume sessions';
  END IF;

  UPDATE work_sessions
    SET clock_out_at = NULL, status = 'active'
    WHERE id = p_session_id AND status = 'completed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resume_session(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resume_session(uuid) FROM anon;
