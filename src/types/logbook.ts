/**
 * Row types and unions for the Logbook schema.
 * Mirrors supabase/migrations/20260610000001_logbook_schema.sql.
 */

export type Role = "admin" | "employee";
export type SessionStatus = "active" | "paused" | "completed";
export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  website: string | null;
  avatar_url: string | null;
  role: Role;
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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
