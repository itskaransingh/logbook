/**
 * Today's work sessions for the signed-in user: state + clock mutations.
 * Supports multiple clock-in/out cycles per day — the latest session is
 * the "active" one. After clocking out, the user can clock in again.
 * All stored timestamps come from the server (column defaults and the
 * clock_out/end_break RPCs) — the client never writes times.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { localWorkDate } from "../lib/dates";
import { SessionBreak, WorkSession } from "../types/logbook";

const REFRESH_MS = 30000;

export function useWorkSession() {
  const { session } = useSession();
  const uid = session?.user.id;

  /** All sessions for today, ordered chronologically. */
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  /** The most recent session (the one the user interacts with). */
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [breaks, setBreaks] = useState<SessionBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const { data: allSessions, error: wsError } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("user_id", uid)
      .eq("work_date", localWorkDate())
      .order("clock_in_at", { ascending: true });

    if (wsError) {
      setError(wsError.message);
      setLoading(false);
      return;
    }

    const list = (allSessions as WorkSession[]) ?? [];
    setSessions(list);

    // The "current" session is the latest one.
    const latest = list.length > 0 ? list[list.length - 1] : null;
    setWorkSession(latest);

    if (latest) {
      const { data: br } = await supabase
        .from("session_breaks")
        .select("*")
        .eq("session_id", latest.id)
        .order("started_at");
      setBreaks((br as SessionBreak[]) ?? []);
    } else {
      setBreaks([]);
    }
    setError(null);
    setLoading(false);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  /**
   * Clock in — creates a new session. Works even if previous sessions
   * exist (the unique constraint has been dropped).
   */
  const clockIn = useCallback(async () => {
    if (!uid) return;
    const { error } = await supabase
      .from("work_sessions")
      .insert({ user_id: uid, work_date: localWorkDate() });
    if (error) {
      setError(error.message);
    }
    await refresh();
  }, [uid, refresh]);

  const pause = useCallback(async () => {
    if (!workSession) return;
    const { error: breakError } = await supabase
      .from("session_breaks")
      .insert({ session_id: workSession.id });
    if (breakError) {
      setError(breakError.message);
    } else {
      await supabase
        .from("work_sessions")
        .update({ status: "paused" })
        .eq("id", workSession.id);
    }
    await refresh();
  }, [workSession, refresh]);

  const resume = useCallback(async () => {
    if (!workSession) return;
    const { error } = await supabase.rpc("end_break", {
      p_session_id: workSession.id,
    });
    if (error) setError(error.message);
    await refresh();
  }, [workSession, refresh]);

  const clockOut = useCallback(async () => {
    if (!workSession) return;
    const { error } = await supabase.rpc("clock_out", {
      p_session_id: workSession.id,
    });
    if (error) setError(error.message);
    await refresh();
  }, [workSession, refresh]);

  /** Whether the user can clock in (no active/paused session). */
  const canClockIn =
    workSession === null || workSession.status === "completed";

  return {
    workSession,
    sessions,
    breaks,
    loading,
    error,
    canClockIn,
    refresh,
    clockIn,
    pause,
    resume,
    clockOut,
  };
}
