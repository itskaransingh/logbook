/**
 * @fileoverview Tasks screen — today's task list plus tomorrow's plan.
 * Includes time tracking (start/stop timers), estimated time display,
 * and overtime reason modal when completing over-estimate tasks.
 */

import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTasks } from "@/src/hooks/useTasks";
import { useTaskTimer } from "@/src/hooks/useTaskTimer";
import TaskItem from "@/src/components/logbook/TaskItem";
import TaskForm from "@/src/components/logbook/TaskForm";
import OvertimeReasonModal from "@/src/components/logbook/OvertimeReasonModal";
import { Task, TaskStatus } from "@/src/types/logbook";

const Section = ({ title, tasks, children }: {
  title: string;
  tasks: Task[];
  children: (task: Task) => React.ReactNode;
}) => {
  if (tasks.length === 0) return null;
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-500 uppercase mb-2">
        {title} ({tasks.length})
      </Text>
      {tasks.map((t) => (
        <React.Fragment key={t.id}>{children(t)}</React.Fragment>
      ))}
    </View>
  );
};

export default function TasksScreen() {
  const { tasks, upcoming, loading, error, createTask, setStatus, completeWithOvertimeReason, deleteTask } =
    useTasks();
  const taskTimer = useTaskTimer();
  const [showForm, setShowForm] = useState(false);

  // Overtime modal state
  const [overtimeTask, setOvertimeTask] = useState<Task | null>(null);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);

  const sections = useMemo(
    () => ({
      inProgress: tasks.filter((t) => t.status === "in_progress"),
      todo: tasks.filter((t) => t.status === "todo"),
      done: tasks.filter((t) => t.status === "done"),
    }),
    [tasks]
  );

  const handleSetStatus = async (task: Task, status: TaskStatus) => {
    const tracked = taskTimer.totalSeconds(task.id);

    // Stop timer when completing
    if (status === "done" && taskTimer.runningTaskIds.has(task.id)) {
      await taskTimer.stopTimer(task.id);
    }

    const result = await setStatus(task, status, tracked);
    if (result.needsOvertimeReason) {
      // Stop timer if still running
      if (taskTimer.runningTaskIds.has(task.id)) {
        await taskTimer.stopTimer(task.id);
      }
      setOvertimeTask(task);
      setOvertimeSeconds(tracked);
    }
  };

  const renderTaskItem = (task: Task, opts?: { showDelete?: boolean }) => (
    <TaskItem
      task={task}
      onSetStatus={handleSetStatus}
      onDelete={opts?.showDelete !== false ? deleteTask : undefined}
      isTimerRunning={taskTimer.runningTaskIds.has(task.id)}
      trackedSeconds={taskTimer.totalSeconds(task.id)}
      onStartTimer={taskTimer.startTimer}
      onStopTimer={taskTimer.stopTimer}
    />
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            Today's Tasks
          </Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-lg py-2 px-4 active:bg-blue-700"
            onPress={() => setShowForm((s) => !s)}
          >
            <Text className="text-white font-medium">
              {showForm ? "Close" : "+ New Task"}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View className="mb-5">
            <TaskForm
              showPlanDate
              onSubmit={async (input) => {
                const err = await createTask(input);
                if (!err) setShowForm(false);
                return err;
              }}
            />
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm text-center">{error}</Text>
          </View>
        )}

        {!loading && tasks.length === 0 && upcoming.length === 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-8">
            <Text className="text-gray-400 text-center">
              No tasks yet. Add one to plan your day — unfinished tasks roll
              over to tomorrow automatically.
            </Text>
          </View>
        )}

        <Section title="In Progress" tasks={sections.inProgress}>
          {(t) => renderTaskItem(t)}
        </Section>
        <Section title="To Do" tasks={sections.todo}>
          {(t) => renderTaskItem(t)}
        </Section>
        <Section title="Done Today" tasks={sections.done}>
          {(t) => (
            <TaskItem
              task={t}
              onSetStatus={handleSetStatus}
              trackedSeconds={taskTimer.totalSeconds(t.id)}
            />
          )}
        </Section>
        <Section title="Tomorrow's Plan" tasks={upcoming}>
          {(t) => <TaskItem task={t} onDelete={deleteTask} />}
        </Section>

        {/* Overtime reason modal */}
        {overtimeTask && (
          <OvertimeReasonModal
            visible={!!overtimeTask}
            taskTitle={overtimeTask.title}
            estimatedMinutes={overtimeTask.estimated_minutes!}
            actualSeconds={overtimeSeconds}
            onCancel={() => setOvertimeTask(null)}
            onConfirm={async (reason) => {
              await completeWithOvertimeReason(overtimeTask.id, reason);
              setOvertimeTask(null);
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}
