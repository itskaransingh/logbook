-- Multiple clock-in/out sessions per day + admin task comments.

-- ============================================================
-- 1. Allow multiple work sessions per day
-- ============================================================

-- Drop the unique constraint that prevents re-clocking-in.
ALTER TABLE public.work_sessions DROP CONSTRAINT work_sessions_user_id_work_date_key;

-- Add an index for efficient lookups (replaces the unique index).
CREATE INDEX IF NOT EXISTS work_sessions_user_date_idx
  ON public.work_sessions(user_id, work_date);

-- New view: aggregate all sessions in a day into one summary row.
-- This replaces session_summaries for daily totals (dashboard, admin).
CREATE VIEW public.daily_session_summaries
WITH (security_invoker = true) AS
SELECT
  ws.user_id,
  ws.work_date,
  min(ws.clock_in_at) AS first_clock_in,
  max(ws.clock_out_at) AS last_clock_out,
  -- "status" for the day: active if any session is active, paused if any
  -- is paused, completed if all are completed.
  CASE
    WHEN bool_or(ws.status = 'active') THEN 'active'
    WHEN bool_or(ws.status = 'paused') THEN 'paused'
    ELSE 'completed'
  END AS status,
  count(*)::int AS session_count,
  sum(
    extract(epoch FROM (coalesce(ws.clock_out_at, now()) - ws.clock_in_at))
  )::int AS total_seconds,
  coalesce((
    SELECT sum(extract(epoch FROM (coalesce(b.ended_at, now()) - b.started_at)))::int
    FROM public.session_breaks b
    WHERE b.session_id IN (
      SELECT id FROM public.work_sessions w
      WHERE w.user_id = ws.user_id AND w.work_date = ws.work_date
    )
  ), 0) AS break_seconds
FROM public.work_sessions ws
GROUP BY ws.user_id, ws.work_date;

-- ============================================================
-- 2. Task comments (admin feedback on tasks)
-- ============================================================

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_comments_task_idx ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Anyone who can view the task owner can view comments.
CREATE POLICY "View permitted task comments"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND public.can_view_user(t.user_id)
    )
  );

-- Admins can insert comments on any visible task.
CREATE POLICY "Insert task comments (admin)"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_admin()
  );

-- Users can also comment on their own tasks.
CREATE POLICY "Insert task comments (own task)"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND t.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.task_comments FROM anon;
GRANT SELECT, INSERT ON public.task_comments TO authenticated;
