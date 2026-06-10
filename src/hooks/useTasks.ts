/**
 * Tasks for a user (defaults to the signed-in user; admins pass a team
 * member's id), split by planned_for: `tasks` is today's list — anything
 * not done and planned for today or earlier, plus whatever was completed
 * today — and `upcoming` is the plan for tomorrow (and beyond). A task
 * whose planned_for is before today is "carried over".
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { localWorkDate, startOfLocalDayISO } from "../lib/dates";
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
  const [upcoming, setUpcoming] = useState<Task[]>([]);
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
      const today = localWorkDate();
      const sorted = ((data as Task[]) ?? []).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
      setTasks(sorted.filter((t) => t.planned_for <= today));
      setUpcoming(sorted.filter((t) => t.planned_for > today));
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
      /** Local work date (YYYY-MM-DD); defaults to today. */
      plannedFor?: string;
    }): Promise<string | null> => {
      if (!session?.user.id || !targetUser) return "Not signed in";
      const { error } = await supabase.from("tasks").insert({
        user_id: targetUser,
        created_by: session.user.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        planned_for: input.plannedFor ?? localWorkDate(),
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

  return {
    tasks,
    upcoming,
    loading,
    error,
    refresh,
    createTask,
    setStatus,
    deleteTask,
  };
}
