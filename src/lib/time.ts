/**
 * Duration helpers. Stored timestamps always come from the server; these
 * functions only format/derive values for display.
 */

import { SessionBreak, SessionSummary, WorkSession } from "../types/logbook";

/** "6h 32m" (or "45m" / "12s" for short spans). */
export const formatDuration = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

/** "06:32:09" ticking-clock format. */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

export const workedSeconds = (summary: SessionSummary): number =>
  summary.total_seconds - summary.break_seconds;

const elapsedSince = (iso: string, until?: string | null): number =>
  ((until ? new Date(until) : new Date()).getTime() - new Date(iso).getTime()) /
  1000;

/** Live break total for a session, including any still-open break. */
export const breakSecondsOf = (breaks: SessionBreak[]): number =>
  breaks.reduce((sum, b) => sum + elapsedSince(b.started_at, b.ended_at), 0);

/** Live worked total = elapsed since clock-in minus breaks. */
export const workedSecondsOf = (
  session: WorkSession,
  breaks: SessionBreak[]
): number =>
  elapsedSince(session.clock_in_at, session.clock_out_at) -
  breakSecondsOf(breaks);

/** "9:41 AM" local time from an ISO timestamp. */
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
