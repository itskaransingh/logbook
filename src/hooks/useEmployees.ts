/**
 * Admin dashboard data: every team member (employees and other admins,
 * excluding the signed-in admin — their own day lives on the Today tab)
 * joined client-side with today's daily session summary and this week's
 * totals. Uses `daily_session_summaries` which aggregates multiple
 * sessions per day. RLS restricts this data to admins.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { localWorkDate, startOfWeekDate } from "../lib/dates";
import { DailySessionSummary, Profile } from "../types/logbook";

const REFRESH_MS = 30000;

export interface EmployeeOverview {
  profile: Profile;
  today: DailySessionSummary | null;
  weekWorkedSeconds: number;
}

/** Worked seconds from a daily summary = total_seconds - break_seconds. */
const workedFromDaily = (s: DailySessionSummary): number =>
  s.total_seconds - s.break_seconds;

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
        .from("daily_session_summaries")
        .select("*")
        .gte("work_date", startOfWeekDate()),
    ]);

    if (profilesRes.error || weekRes.error) {
      setError((profilesRes.error ?? weekRes.error)!.message);
      setLoading(false);
      return;
    }

    const today = localWorkDate();
    const summaries = (weekRes.data as DailySessionSummary[]) ?? [];

    const overview = ((profilesRes.data as Profile[]) ?? [])
      .filter((profile) => profile.id !== selfId)
      .map((profile) => {
        const mine = summaries.filter((s) => s.user_id === profile.id);
        return {
          profile,
          today: mine.find((s) => s.work_date === today) ?? null,
          weekWorkedSeconds: mine.reduce((sum, s) => sum + workedFromDaily(s), 0),
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
