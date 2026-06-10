/**
 * Admin dashboard data: all employees joined client-side with today's
 * session summary and this week's totals. RLS already restricts this to
 * admins (and hides other admins' rows everywhere).
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { localWorkDate, startOfWeekDate } from "../lib/dates";
import { Profile, SessionSummary } from "../types/logbook";
import { workedSeconds } from "../lib/time";

const REFRESH_MS = 30000;

export interface EmployeeOverview {
  profile: Profile;
  today: SessionSummary | null;
  weekWorkedSeconds: number;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [profilesRes, weekRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "employee")
        .order("full_name"),
      supabase
        .from("session_summaries")
        .select("*")
        .gte("work_date", startOfWeekDate()),
    ]);

    if (profilesRes.error || weekRes.error) {
      setError((profilesRes.error ?? weekRes.error)!.message);
      setLoading(false);
      return;
    }

    const today = localWorkDate();
    const summaries = (weekRes.data as SessionSummary[]) ?? [];

    const overview = ((profilesRes.data as Profile[]) ?? []).map((profile) => {
      const mine = summaries.filter((s) => s.user_id === profile.id);
      return {
        profile,
        today: mine.find((s) => s.work_date === today) ?? null,
        weekWorkedSeconds: mine.reduce((sum, s) => sum + workedSeconds(s), 0),
      };
    });

    setEmployees(overview);
    setError(null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  return { employees, loading, error, refresh };
}
