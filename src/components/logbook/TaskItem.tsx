/**
 * Single task row: status toggle, priority pill, "Assigned" badge when the
 * creator differs from the assignee, "Carried over" when created before today.
 */

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Task, TaskStatus } from "../../types/logbook";
import { localWorkDate } from "../../lib/dates";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
} as const;

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_ICON: Record<TaskStatus, string> = {
  todo: "○",
  in_progress: "◐",
  done: "●",
};

interface TaskItemProps {
  task: Task;
  onSetStatus?: (task: Task, status: TaskStatus) => void;
  onDelete?: (task: Task) => void;
}

export default function TaskItem({ task, onSetStatus, onDelete }: TaskItemProps) {
  const assigned = task.created_by !== task.user_id;
  const carriedOver =
    task.status !== "done" && task.created_at.slice(0, 10) < localWorkDate();

  return (
    <View className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex-row items-start">
      <TouchableOpacity
        className="pr-3 pt-0.5"
        onPress={onSetStatus ? () => onSetStatus(task, NEXT_STATUS[task.status]) : undefined}
        disabled={!onSetStatus}
      >
        <Text
          className={`text-xl ${
            task.status === "done"
              ? "text-green-600"
              : task.status === "in_progress"
              ? "text-blue-600"
              : "text-gray-400"
          }`}
        >
          {STATUS_ICON[task.status]}
        </Text>
      </TouchableOpacity>

      <View className="flex-1">
        <Text
          className={`text-base ${
            task.status === "done"
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
        <View className="flex-row flex-wrap gap-2 mt-2">
          <View
            className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLES[task.priority]}`}
          >
            <Text className={`text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </Text>
          </View>
          {assigned && (
            <View className="rounded-full px-2 py-0.5 bg-purple-100">
              <Text className="text-xs font-medium text-purple-700">
                Assigned
              </Text>
            </View>
          )}
          {carriedOver && (
            <View className="rounded-full px-2 py-0.5 bg-blue-100">
              <Text className="text-xs font-medium text-blue-700">
                Carried over
              </Text>
            </View>
          )}
        </View>
      </View>

      {onDelete && (
        <TouchableOpacity className="pl-2 pt-0.5" onPress={() => onDelete(task)}>
          <Text className="text-gray-300 text-lg">×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
