/**
 * Comments on a task — admins can comment on any task, employees on
 * their own. Used for admin feedback, clarifications, and discussion.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { TaskComment, Profile } from "../types/logbook";

const REFRESH_MS = 30000;

export interface CommentWithAuthor extends TaskComment {
  author_name: string | null;
  author_role: string | null;
}

export function useTaskComments(taskId: string | null) {
  const { session } = useSession();
  const uid = session?.user.id;

  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      setLoading(false);
      return;
    }

    // Fetch comments + join author name from profiles.
    const { data } = await supabase
      .from("task_comments")
      .select("*, profiles:user_id(full_name, role)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (data) {
      const mapped = (data as any[]).map((row) => ({
        id: row.id,
        task_id: row.task_id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        author_name: row.profiles?.full_name ?? null,
        author_role: row.profiles?.role ?? null,
      }));
      setComments(mapped);
    }
    setLoading(false);
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const addComment = useCallback(
    async (content: string): Promise<string | null> => {
      if (!uid || !taskId) return "Not signed in";
      const { error } = await supabase
        .from("task_comments")
        .insert({ task_id: taskId, user_id: uid, content: content.trim() });
      await refresh();
      return error ? error.message : null;
    },
    [uid, taskId, refresh]
  );

  return { comments, loading, addComment, refresh };
}
