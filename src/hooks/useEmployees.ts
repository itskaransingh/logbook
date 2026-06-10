/**
 * Admin dashboard data: every team member (employees and other admins,
 * excluding the signed-in admin — their own day lives on the Today tab)
 * joined client-side with today's session summary and this week's totals.
 * RLS restricts this data to admins.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
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
  const { session } = useSession();
  const selfId = session?.user.id;

  const [employees, setEmployees] = useState<EmployeeOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [profilesRes, weekRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
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

    const overview = ((profilesRes.data as Profile[]) ?? [])
      .filter((profile) => profile.id !== selfId)
      .map((profile) => {
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
  }, [selfId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  return { employees, loading, error, refresh };
}
