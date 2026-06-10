/**
 * Hourly updates for a (user, work date) pair. Defaults to the signed-in
 * user and today; admins pass an employee id and a date to read theirs.
 * Saving upserts on (user_id, work_date, hour); the database flags edits
 * and rejects writes outside the current day.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { localWorkDate } from "../lib/dates";
import { HourlyUpdate } from "../types/logbook";

const REFRESH_MS = 30000;

export function useHourlyUpdates(userId?: string, workDate?: string) {
  const { session } = useSession();
  const targetUser = userId ?? session?.user.id;
  const targetDate = workDate ?? localWorkDate();

  const [updates, setUpdates] = useState<HourlyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!targetUser) return;
    const { data, error } = await supabase
      .from("hourly_updates")
      .select("*")
      .eq("user_id", targetUser)
      .eq("work_date", targetDate)
      .order("hour");
    if (error) {
      setError(error.message);
    } else {
      setUpdates((data as HourlyUpdate[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, [targetUser, targetDate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const saveUpdate = useCallback(
    async (hour: number, content: string): Promise<string | null> => {
      if (!session?.user.id) return "Not signed in";
      const { error } = await supabase.from("hourly_updates").upsert(
        {
          user_id: session.user.id,
          work_date: targetDate,
          hour,
          content: content.trim(),
        },
        { onConflict: "user_id,work_date,hour" }
      );
      await refresh();
      return error ? error.message : null;
    },
    [session?.user.id, targetDate, refresh]
  );

  return { updates, loading, error, refresh, saveUpdate };
}
