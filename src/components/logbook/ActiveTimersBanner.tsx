/**
 * Compact banner at the top of the Today screen showing all running task
 * timers with live elapsed time and visual urgency.
 */

import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Task } from "../../types/logbook";
import { formatClock, formatDuration } from "../../lib/time";

interface ActiveTimersBannerProps {
  tasks: Task[];
  runningTaskIds: Set<string>;
  totalSeconds: (taskId: string) => number;
  onStop: (taskId: string) => void;
}

/** Returns a color class based on how close we are to the estimate. */
function urgencyColor(task: Task, elapsed: number): string {
  if (!task.estimated_minutes) return "text-blue-600";
  const ratio = elapsed / (task.estimated_minutes * 60);
  if (ratio >= 1) return "text-red-600";
  if (ratio >= 0.8) return "text-amber-600";
  return "text-green-600";
}

function urgencyBg(task: Task, elapsed: number): string {
  if (!task.estimated_minutes) return "bg-blue-50 border-blue-200";
  const ratio = elapsed / (task.estimated_minutes * 60);
  if (ratio >= 1) return "bg-red-50 border-red-200";
  if (ratio >= 0.8) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

export default function ActiveTimersBanner({
  tasks,
  runningTaskIds,
  totalSeconds,
  onStop,
}: ActiveTimersBannerProps) {
  // 1s tick for live display
  const [, setTick] = useState(0);
  const hasRunning = runningTaskIds.size > 0;

  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [hasRunning]);

  const runningTasks = tasks.filter((t) => runningTaskIds.has(t.id));
  if (runningTasks.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-500 uppercase mb-2">
        ▶ Active Timers ({runningTasks.length})
      </Text>
      {runningTasks.map((task) => {
        const elapsed = totalSeconds(task.id);
        return (
          <View
            key={task.id}
            className={`flex-row items-center border rounded-lg px-3 py-2 mb-1 ${urgencyBg(
              task,
              elapsed
            )}`}
          >
            <View className="flex-1 mr-2">
              <Text className="text-sm text-gray-900" numberOfLines={1}>
                {task.title}
              </Text>
              <Text className={`text-xs font-mono ${urgencyColor(task, elapsed)}`}>
                {formatClock(elapsed)}
                {task.estimated_minutes
                  ? ` / ${formatDuration(task.estimated_minutes * 60)}`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 active:bg-gray-100"
              onPress={() => onStop(task.id)}
            >
              <Text className="text-xs font-medium text-gray-700">■ Stop</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}
