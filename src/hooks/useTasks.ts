/**
 * "Today's tasks" for a user (defaults to the signed-in user; admins pass
 * an employee id). Carry-over is computed at read time: anything not done
 * is always in the list, plus whatever was completed today. A task whose
 * created_at is before today is "carried over".
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { startOfLocalDayISO } from "../lib/dates";
import { Task, TaskPriority, TaskStatus } from "../types/logbook";

const REFRESH_MS = 30000;

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function useTasks(userId?: string) {
  const { session } = useSession();
  const targetUser = userId ?? session?.user.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!targetUser) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", targetUser)
      .or(`status.neq.done,completed_at.gte.${startOfLocalDayISO()}`)
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      const sorted = ((data as Task[]) ?? []).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
      setTasks(sorted);
      setError(null);
    }
    setLoading(false);
  }, [targetUser]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const createTask = useCallback(
    async (input: {
      title: string;
      description?: string;
      priority: TaskPriority;
    }): Promise<string | null> => {
      if (!session?.user.id || !targetUser) return "Not signed in";
      const { error } = await supabase.from("tasks").insert({
        user_id: targetUser,
        created_by: session.user.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
      });
      await refresh();
      return error ? error.message : null;
    },
    [session?.user.id, targetUser, refresh]
  );

  const setStatus = useCallback(
    async (task: Task, status: TaskStatus): Promise<string | null> => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", task.id);
      await refresh();
      return error ? error.message : null;
    },
    [refresh]
  );

  const deleteTask = useCallback(
    async (task: Task): Promise<string | null> => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      await refresh();
      return error ? error.message : null;
    },
    [refresh]
  );

  return { tasks, loading, error, refresh, createTask, setStatus, deleteTask };
}
