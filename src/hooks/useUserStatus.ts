/**
 * Slack-like user status (emoji + label). One row per user, upserted.
 * Auto-refreshes every 30 s to stay in sync with the dashboard.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { UserStatus } from "../types/logbook";

const REFRESH_MS = 30000;

export const STATUS_PRESETS = [
  { emoji: "🟢", label: "Working" },
  { emoji: "🔵", label: "In a meeting" },
  { emoji: "🍽️", label: "Lunch / Away" },
  { emoji: "☕", label: "Short break" },
  { emoji: "🏠", label: "Working remotely" },
] as const;

export function useUserStatus(userId?: string) {
  const { session } = useSession();
  const targetUser = userId ?? session?.user.id;

  const [status, setStatusState] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!targetUser) return;
    const { data } = await supabase
      .from("user_status")
      .select("*")
      .eq("user_id", targetUser)
      .maybeSingle();
    setStatusState((data as UserStatus) ?? null);
    setLoading(false);
  }, [targetUser]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const setStatus = useCallback(
    async (emoji: string, label: string): Promise<string | null> => {
      if (!session?.user.id) return "Not signed in";
      const { error } = await supabase
        .from("user_status")
        .upsert(
          {
            user_id: session.user.id,
            emoji,
            label: label.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      await refresh();
      return error ? error.message : null;
    },
    [session?.user.id, refresh]
  );

  const clearStatus = useCallback(async (): Promise<string | null> => {
    return setStatus("🟢", "Working");
  }, [setStatus]);

  return { status, loading, setStatus, clearStatus, refresh };
}
