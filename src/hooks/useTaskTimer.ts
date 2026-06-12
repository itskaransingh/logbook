/**
 * Task time tracking: start / stop timers on tasks.
 * Multiple tasks can have running timers simultaneously.
 * Server-side `stop_task_timer` RPC keeps timestamps honest.
 */

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../context/SessionProvider";
import { Task, TaskTimeEntry } from "../types/logbook";

const REFRESH_MS = 10000; // tick faster for live timers

export function useTaskTimer() {
  const { session } = useSession();
  const uid = session?.user.id;

  const [entries, setEntries] = useState<TaskTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("task_time_entries")
      .select("*")
      .eq("user_id", uid)
      .order("started_at", { ascending: true });
    setEntries((data as TaskTimeEntry[]) ?? []);
    setLoading(false);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh])
  );

  /** Set of task IDs that currently have a running (open) timer. */
  const runningTaskIds = new Set(
    entries.filter((e) => e.stopped_at === null).map((e) => e.task_id)
  );

  /** Total tracked seconds for a task (all completed intervals + running). */
  const totalSeconds = useCallback(
    (taskId: string): number => {
      const taskEntries = entries.filter((e) => e.task_id === taskId);
      const now = Date.now();
      return taskEntries.reduce((sum, e) => {
        const end = e.stopped_at
          ? new Date(e.stopped_at).getTime()
          : now;
        return sum + (end - new Date(e.started_at).getTime()) / 1000;
      }, 0);
    },
    [entries]
  );

  /** Whether a task has exceeded its estimated_minutes. */
  const isOvertime = useCallback(
    (task: Task): boolean => {
      if (!task.estimated_minutes) return false;
      return totalSeconds(task.id) > task.estimated_minutes * 60;
    },
    [totalSeconds]
  );

  /** Overtime amount in seconds (positive = over, negative = under). */
  const overtimeSeconds = useCallback(
    (task: Task): number => {
      if (!task.estimated_minutes) return 0;
      return totalSeconds(task.id) - task.estimated_minutes * 60;
    },
    [totalSeconds]
  );

  const startTimer = useCallback(
    async (taskId: string): Promise<string | null> => {
      if (!uid) return "Not signed in";
      const { error } = await supabase
        .from("task_time_entries")
        .insert({ task_id: taskId, user_id: uid });
      await refresh();
      return error ? error.message : null;
    },
    [uid, refresh]
  );

  const stopTimer = useCallback(
    async (taskId: string): Promise<string | null> => {
      const { error } = await supabase.rpc("stop_task_timer", {
        p_task_id: taskId,
      });
      await refresh();
      return error ? error.message : null;
    },
    [refresh]
  );

  return {
    entries,
    loading,
    runningTaskIds,
    totalSeconds,
    isOvertime,
    overtimeSeconds,
    startTimer,
    stopTimer,
    refresh,
  };
}
