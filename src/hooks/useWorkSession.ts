/**
 * Today's work session for the signed-in user: state + clock mutations.
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

  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [breaks, setBreaks] = useState<SessionBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const { data: ws, error: wsError } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("user_id", uid)
      .eq("work_date", localWorkDate())
      .maybeSingle();

    if (wsError) {
      setError(wsError.message);
      setLoading(false);
      return;
    }

    setWorkSession((ws as WorkSession) ?? null);
    if (ws) {
      const { data: br } = await supabase
        .from("session_breaks")
        .select("*")
        .eq("session_id", ws.id)
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

  const clockIn = useCallback(async () => {
    if (!uid) return;
    const { error } = await supabase
      .from("work_sessions")
      .insert({ user_id: uid, work_date: localWorkDate() });
    if (error) {
      setError(
        error.code === "23505"
          ? "You already ended your day. See you tomorrow!"
          : error.message
      );
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

  return {
    workSession,
    breaks,
    loading,
    error,
    refresh,
    clockIn,
    pause,
    resume,
    clockOut,
  };
}
