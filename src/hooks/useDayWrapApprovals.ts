import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { DayWrap } from "@/src/types/logbook";

interface PendingWrap extends DayWrap {
  employee_name: string | null;
}

export function useDayWrapApprovals() {
  const [pendingWraps, setPendingWraps] = useState<PendingWrap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("day_wraps")
      .select(`
        *,
        employee:profiles!day_wraps_user_id_fkey(full_name)
      `)
      .eq("status", "pending")
      .order("wrapped_at", { ascending: false });

    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      employee_name: row.employee?.full_name ?? null,
    }));
    setPendingWraps(mapped);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetch();
      const interval = setInterval(fetch, 30_000);
      return () => clearInterval(interval);
    }, [fetch])
  );

  async function approveDayWrap(wrapId: string): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc("approve_day_wrap", { p_wrap_id: wrapId });
    if (!error) await fetch();
    return { error: error?.message ?? null };
  }

  return { pendingWraps, loading, approveDayWrap, refresh: fetch };
}
