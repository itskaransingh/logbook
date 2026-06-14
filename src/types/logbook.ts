/**
 * Row types and unions for the Logbook schema.
 * Mirrors supabase/migrations/20260610000001_logbook_schema.sql and later.
 */

export type Role = "admin" | "employee" | "super_admin";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
export type SessionStatus = "active" | "paused" | "completed";
export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "pending_approval"
  | "approved"
  | "needs_changes"
  | "done"; // 'done' is legacy; new flow uses 'approved'

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  website: string | null;
  avatar_url: string | null;
  role: Role;
  department: string | null;
  designation: string | null;
  assigned_admin_id: string | null;
  show_work_to_admins: boolean;
  /** NULL for Platform Users; set for Org Members */
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkSession {
  id: string;
  user_id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionBreak {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

/** Row of the session_summaries view (work_sessions + computed durations). */
export interface SessionSummary {
  id: string;
  user_id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  status: SessionStatus;
  total_seconds: number;
  break_seconds: number;
}

export interface HourlyUpdate {
  id: string;
  user_id: string;
  work_date: string;
  hour: number;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  created_by: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  /** Local work date (YYYY-MM-DD) the task is planned for. */
  planned_for: string;
  /** Optional time estimate in minutes. */
  estimated_minutes: number | null;
  /** Reason provided when completing a task that exceeded its estimate. */
  overtime_reason: string | null;
  /** Optional second approver — either assigned_admin or this person can approve. */
  additional_approver_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
}

export interface UserStatus {
  user_id: string;
  emoji: string;
  label: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

/** Aggregate of all work sessions for a user on a given day. */
export interface DailySessionSummary {
  user_id: string;
  work_date: string;
  first_clock_in: string;
  last_clock_out: string | null;
  status: SessionStatus;
  session_count: number;
  total_seconds: number;
  break_seconds: number;
}

export type DayWrapStatus = "pending" | "approved";

export interface DayWrap {
  id: string;
  user_id: string;
  work_date: string;
  wrapped_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: DayWrapStatus;
}

export type ActivityFeedEventType = "task_approved" | "day_wrapped";

export interface ActivityFeedEvent {
  id: string;
  type: ActivityFeedEventType;
  actor_id: string;
  subject_id: string;
  task_id: string | null;
  content: string;
  created_at: string;
  /** Joined from profiles */
  actor_name: string | null;
  subject_name: string | null;
  task_title: string | null;
}
