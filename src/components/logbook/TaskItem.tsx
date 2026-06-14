/**
 * Single task row: status toggle, priority pill, timer controls,
 * estimated time badge, live elapsed display, "Assigned" badge when the
 * creator differs from the assignee, "Carried over" when planned before today.
 */

import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Task, TaskStatus } from "../../types/logbook";
import { localWorkDate } from "../../lib/dates";
import { formatClock, formatDuration } from "../../lib/time";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
} as const;

// Employee-facing transitions only. pending_approval/approved/done are locked.
const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: "in_progress",
  in_progress: "pending_approval",
  needs_changes: "in_progress", // move back to work after changes requested
};

const STATUS_ICON: Record<TaskStatus, string> = {
  todo: "○",
  in_progress: "◐",
  pending_approval: "⏳",
  needs_changes: "⚠",
  approved: "●",
  done: "●",
};

interface TaskItemProps {
  task: Task;
  onSetStatus?: (task: Task, status: TaskStatus) => void;
  onDelete?: (task: Task) => void;
  /** Whether this task has a running timer. */
  isTimerRunning?: boolean;
  /** Total tracked seconds for this task. */
  trackedSeconds?: number;
  /** Start the timer for this task. */
  onStartTimer?: (taskId: string) => void;
  /** Stop the timer for this task. */
  onStopTimer?: (taskId: string) => void;
}

function urgencyColor(task: Task, elapsed: number): string {
  if (!task.estimated_minutes) return "text-indigo-600";
  const ratio = elapsed / (task.estimated_minutes * 60);
  if (ratio >= 1) return "text-red-600";
  if (ratio >= 0.8) return "text-amber-600";
  return "text-green-600";
}

export default function TaskItem({
  task,
  onSetStatus,
  onDelete,
  isTimerRunning,
  trackedSeconds,
  onStartTimer,
  onStopTimer,
}: TaskItemProps) {
  const assigned = task.created_by !== task.user_id;
  const isActive = task.status === "todo" || task.status === "in_progress" || task.status === "needs_changes";
  const isLocked = task.status === "pending_approval" || task.status === "approved" || task.status === "done";
  const carriedOver = isActive && task.planned_for < localWorkDate();
  const nextStatus = NEXT_STATUS[task.status];
  const hasEstimate = task.estimated_minutes != null;
  const elapsed = trackedSeconds ?? 0;

  // Live tick when timer is running
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  return (
    <View className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex-row items-start">
      <TouchableOpacity
        className="pr-3 pt-0.5"
        onPress={onSetStatus && nextStatus ? () => onSetStatus(task, nextStatus) : undefined}
        disabled={!onSetStatus || !nextStatus}
      >
        <Text
          className={`text-xl ${
            task.status === "approved" || task.status === "done"
              ? "text-green-600"
              : task.status === "in_progress"
              ? "text-indigo-600"
              : task.status === "pending_approval"
              ? "text-amber-500"
              : task.status === "needs_changes"
              ? "text-red-500"
              : "text-gray-400"
          }`}
        >
          {STATUS_ICON[task.status]}
        </Text>
      </TouchableOpacity>

      <View className="flex-1">
        <Text
          className={`text-base ${
            task.status === "approved" || task.status === "done"
              ? "text-gray-400 line-through"
              : "text-gray-900"
          }`}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text className="text-sm text-gray-500 mt-0.5">
            {task.description}
          </Text>
        ) : null}

        {/* Pending approval / needs changes badges */}
        {task.status === "pending_approval" && (
          <Text className="text-xs text-amber-600 mt-1">Awaiting approval…</Text>
        )}
        {task.status === "needs_changes" && (
          <Text className="text-xs text-red-600 mt-1">Changes requested — tap ⚠ to resume</Text>
        )}

        {/* Live timer display */}
        {(isTimerRunning || elapsed > 0) && isActive && (
          <View className="flex-row items-center gap-2 mt-1">
            <Text
              className={`text-xs font-mono font-medium ${urgencyColor(
                task,
                elapsed
              )}`}
            >
              {isTimerRunning ? "▶" : "⏸"} {formatClock(elapsed)}
            </Text>
            {hasEstimate && (
              <Text className="text-xs text-gray-400">
                / {formatDuration(task.estimated_minutes! * 60)}
              </Text>
            )}
          </View>
        )}

        {/* Badges row */}
        <View className="flex-row flex-wrap gap-2 mt-2">
          <View
            className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLES[task.priority]}`}
          >
            <Text className={`text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </Text>
          </View>
          {hasEstimate && (
            <View className="rounded-full px-2 py-0.5 bg-indigo-100">
              <Text className="text-xs font-medium text-indigo-700">
                ⏱ {formatDuration(task.estimated_minutes! * 60)}
              </Text>
            </View>
          )}
          {assigned && (
            <View className="rounded-full px-2 py-0.5 bg-purple-100">
              <Text className="text-xs font-medium text-purple-700">
                Assigned
              </Text>
            </View>
          )}
          {carriedOver && (
            <View className="rounded-full px-2 py-0.5 bg-indigo-50">
              <Text className="text-xs font-medium text-indigo-600">
                Carried over
              </Text>
            </View>
          )}
          {task.overtime_reason && (
            <View className="rounded-full px-2 py-0.5 bg-red-100">
              <Text className="text-xs font-medium text-red-700">
                ⏰ Overtime
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Timer + delete controls */}
      <View className="flex-col items-center gap-1 pl-2">
        {isActive && onStartTimer && onStopTimer && (
          <TouchableOpacity
            className={`rounded-lg px-2 py-1.5 ${
              isTimerRunning
                ? "bg-red-100 active:bg-red-200"
                : "bg-green-100 active:bg-green-200"
            }`}
            onPress={() =>
              isTimerRunning
                ? onStopTimer(task.id)
                : onStartTimer(task.id)
            }
          >
            <Text
              className={`text-xs font-medium ${
                isTimerRunning ? "text-red-700" : "text-green-700"
              }`}
            >
              {isTimerRunning ? "■" : "▶"}
            </Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity className="pt-0.5" onPress={() => onDelete(task)}>
            <Text className="text-gray-300 text-lg">×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
