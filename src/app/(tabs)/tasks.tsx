/**
 * @fileoverview Tasks screen — today's task list plus tomorrow's plan.
 * Includes time tracking (start/stop timers), estimated time display,
 * and overtime reason modal when completing over-estimate tasks.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTasks } from "@/src/hooks/useTasks";
import { useTaskTimer } from "@/src/hooks/useTaskTimer";
import { useTaskComments } from "@/src/hooks/useTaskComments";
import TaskItem from "@/src/components/logbook/TaskItem";
import TaskForm from "@/src/components/logbook/TaskForm";
import TaskComments from "@/src/components/logbook/TaskComments";
import OvertimeReasonModal from "@/src/components/logbook/OvertimeReasonModal";
import { ConfettiReward } from "@/src/components/logbook/ConfettiReward";
import { Task, TaskStatus } from "@/src/types/logbook";

const Section = ({ title, tasks, children }: {
  title: string;
  tasks: Task[];
  children: (task: Task) => React.ReactNode;
}) => {
  if (tasks.length === 0) return null;
  return (
    <View className="mb-5">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        {title} · {tasks.length}
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
  const [expandedCommentTaskId, setExpandedCommentTaskId] = useState<string | null>(null);
  const taskComments = useTaskComments(expandedCommentTaskId);

  // Overtime modal state
  const [overtimeTask, setOvertimeTask] = useState<Task | null>(null);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);

  // Mini confetti when a task transitions pending_approval → approved
  const [miniConfetti, setMiniConfetti] = useState(false);
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = prevStatuses.current;
    const fired = tasks.some(
      (t) => t.status === "approved" && prev[t.id] === "pending_approval"
    );
    if (fired) setMiniConfetti(true);
    prevStatuses.current = Object.fromEntries(tasks.map((t) => [t.id, t.status]));
  }, [tasks]);

  const sections = useMemo(
    () => ({
      inProgress: tasks.filter((t) => t.status === "in_progress"),
      todo: tasks.filter((t) => t.status === "todo"),
      pendingApproval: tasks.filter((t) => t.status === "pending_approval"),
      needsChanges: tasks.filter((t) => t.status === "needs_changes"),
      approved: tasks.filter((t) => t.status === "approved" || t.status === "done"),
    }),
    [tasks]
  );

  const handleSetStatus = async (task: Task, status: TaskStatus) => {
    const tracked = taskTimer.totalSeconds(task.id);

    // Stop timer when submitting for approval
    if (status === "pending_approval" && taskTimer.runningTaskIds.has(task.id)) {
      await taskTimer.stopTimer(task.id);
    }
    // Legacy done path (overtime modal)
    if (status === "done" && taskTimer.runningTaskIds.has(task.id)) {
      await taskTimer.stopTimer(task.id);
    }

    const result = await setStatus(task, status, tracked);
    if (result.needsOvertimeReason) {
      if (taskTimer.runningTaskIds.has(task.id)) {
        await taskTimer.stopTimer(task.id);
      }
      setOvertimeTask(task);
      setOvertimeSeconds(tracked);
    }
  };

  const renderTaskWithComments = (task: Task, opts?: {
    showDelete?: boolean;
    showStatus?: boolean;
    showTimers?: boolean;
  }) => (
    <View>
      <TaskItem
        task={task}
        onSetStatus={opts?.showStatus !== false ? handleSetStatus : undefined}
        onDelete={opts?.showDelete !== false ? deleteTask : undefined}
        isTimerRunning={taskTimer.runningTaskIds.has(task.id)}
        trackedSeconds={taskTimer.totalSeconds(task.id)}
        onStartTimer={opts?.showTimers !== false ? taskTimer.startTimer : undefined}
        onStopTimer={opts?.showTimers !== false ? taskTimer.stopTimer : undefined}
      />
      <View className="ml-8 -mt-1 mb-1">
        <TaskComments
          comments={expandedCommentTaskId === task.id ? taskComments.comments : []}
          onAdd={taskComments.addComment}
          canComment={true}
          onExpand={() => setExpandedCommentTaskId(task.id)}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1">
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            Today's Tasks
          </Text>
          <TouchableOpacity
            className="bg-indigo-600 rounded-lg py-2 px-4 active:bg-indigo-700"
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
          <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center">
            <Text className="text-sm font-semibold text-gray-700 mb-1 text-center">
              No tasks yet
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              Add one to plan your day — unfinished tasks roll over to tomorrow automatically.
            </Text>
          </View>
        )}

        <Section title="In Progress" tasks={sections.inProgress}>
          {(t) => renderTaskWithComments(t)}
        </Section>
        <Section title="To Do" tasks={sections.todo}>
          {(t) => renderTaskWithComments(t)}
        </Section>
        <Section title="Pending Approval" tasks={sections.pendingApproval}>
          {(t) => renderTaskWithComments(t, { showStatus: false, showTimers: false })}
        </Section>
        <Section title="Needs Changes" tasks={sections.needsChanges}>
          {(t) => renderTaskWithComments(t)}
        </Section>
        <Section title="Approved Today" tasks={sections.approved}>
          {(t) => renderTaskWithComments(t, { showDelete: false, showStatus: false, showTimers: false })}
        </Section>
        <Section title="Tomorrow's Plan" tasks={upcoming}>
          {(t) => renderTaskWithComments(t, { showStatus: false, showTimers: false })}
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

    {/* Mini confetti when a task gets approved */}
    <ConfettiReward
      visible={miniConfetti}
      size="mini"
      onDone={() => setMiniConfetti(false)}
    />
    </View>
  );
}
