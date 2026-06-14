import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Task } from "@/src/types/logbook";

interface PendingTask extends Task {
  employee_name: string | null;
}

export function useTaskApprovals() {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // Fetch tasks in pending_approval status.
    // can_view_user() RLS scopes this to the admin's assigned employees automatically.
    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        employee:profiles!tasks_user_id_fkey(full_name)
      `)
      .eq("status", "pending_approval")
      .order("updated_at", { ascending: false });

    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      employee_name: row.employee?.full_name ?? null,
    }));
    setPendingTasks(mapped);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetch();
      const interval = setInterval(fetch, 30_000);
      return () => clearInterval(interval);
    }, [fetch])
  );

  async function approve(taskId: string): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc("approve_task", { p_task_id: taskId });
    if (!error) await fetch();
    return { error: error?.message ?? null };
  }

  async function requestChanges(
    taskId: string,
    comment: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc("request_task_changes", {
      p_task_id: taskId,
      p_comment: comment,
    });
    if (!error) await fetch();
    return { error: error?.message ?? null };
  }

  return { pendingTasks, loading, approve, requestChanges, refresh: fetch };
}
