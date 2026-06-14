import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ActivityFeedEvent } from "@/src/types/logbook";

export function useActivityFeed() {
  const [events, setEvents] = useState<ActivityFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("activity_feed")
      .select(`
        id, type, actor_id, subject_id, task_id, content, created_at,
        actor:profiles!activity_feed_actor_id_fkey(full_name),
        subject:profiles!activity_feed_subject_id_fkey(full_name),
        task:tasks!activity_feed_task_id_fkey(title)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        actor_id: row.actor_id,
        subject_id: row.subject_id,
        task_id: row.task_id,
        content: row.content,
        created_at: row.created_at,
        actor_name: row.actor?.full_name ?? null,
        subject_name: row.subject?.full_name ?? null,
        task_title: row.task?.title ?? null,
      }));
      setEvents(mapped);
      setError(null);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetch();
      const interval = setInterval(fetch, 30_000);
      return () => clearInterval(interval);
    }, [fetch])
  );

  return { events, loading, error, refresh: fetch };
}
