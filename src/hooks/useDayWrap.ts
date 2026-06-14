import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { DayWrap } from "@/src/types/logbook";

function todayLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useDayWrap(userId: string | undefined) {
  const [wrap, setWrap] = useState<DayWrap | null>(null);
  const [hasApprovedAllTasks, setHasApprovedAllTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wrapping, setWrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const today = todayLocalDate();

    const [wrapResult, taskResult] = await Promise.all([
      supabase
        .from("day_wraps")
        .select("*")
        .eq("user_id", userId)
        .eq("work_date", today)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, status")
        .eq("user_id", userId)
        .eq("planned_for", today),
    ]);

    setWrap((wrapResult.data as DayWrap) ?? null);

    const tasks = taskResult.data ?? [];
    const hasAny = tasks.length > 0;
    const allApproved = hasAny && tasks.every((t) => t.status === "approved");
    setHasApprovedAllTasks(allApproved);

    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetch();
      const interval = setInterval(fetch, 30_000);
      return () => clearInterval(interval);
    }, [fetch])
  );

  async function wrapUp(): Promise<{ error: string | null }> {
    setWrapping(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("wrap_up_day");
    if (rpcError) {
      setError(rpcError.message);
      setWrapping(false);
      return { error: rpcError.message };
    }
    await fetch();
    setWrapping(false);
    return { error: null };
  }

  return { wrap, hasApprovedAllTasks, loading, wrapping, error, wrapUp, refresh: fetch };
}
