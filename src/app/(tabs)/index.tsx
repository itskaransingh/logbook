/**
 * @fileoverview Today screen — the employee's home base.
 * Work clock (in/pause/resume/out), status picker, active task timers
 * banner, focus timer, and the hour-by-hour timeline of updates for
 * today. Clocking out goes through a "plan for tomorrow" modal that
 * can save tasks for the next work day.
 */

import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSession } from "@/context/SessionProvider";
import { useWorkSession } from "@/src/hooks/useWorkSession";
import { useHourlyUpdates } from "@/src/hooks/useHourlyUpdates";
import { useTasks } from "@/src/hooks/useTasks";
import { useTaskTimer } from "@/src/hooks/useTaskTimer";
import { useUserStatus } from "@/src/hooks/useUserStatus";
import { useWorkNotifications } from "@/src/hooks/useWorkNotifications";
import ClockCard from "@/src/components/logbook/ClockCard";
import FocusTimer from "@/src/components/logbook/FocusTimer";
import HourlyTimeline from "@/src/components/logbook/HourlyTimeline";
import PlanTomorrowModal, {
  TaskDraft,
} from "@/src/components/logbook/PlanTomorrowModal";
import ActiveTimersBanner from "@/src/components/logbook/ActiveTimersBanner";
import StatusPicker from "@/src/components/logbook/StatusPicker";
import { workDateOffset } from "@/src/lib/dates";

/** Hours from clock-in through the current hour (for today's session). */
const sessionHours = (clockInAt: string | undefined): number[] => {
  if (!clockInAt) return [];
  const start = new Date(clockInAt).getHours();
  const end = new Date().getHours();
  const hours: number[] = [];
  for (let h = start; h <= end; h++) hours.push(h);
  return hours;
};

export default function TodayScreen() {
  const { profile } = useSession();
  const {
    workSession,
    sessions,
    breaks,
    canClockIn,
    error,
    clockIn,
    pause,
    resume,
    clockOut,
  } = useWorkSession();
  const { updates, saveUpdate } = useHourlyUpdates();
  const { tasks, createTask } = useTasks();
  const taskTimer = useTaskTimer();
  const userStatus = useUserStatus();
  const notifications = useWorkNotifications();
  const [planVisible, setPlanVisible] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0];

  const handleClockIn = async () => {
    await clockIn();
    await notifications.onClockIn();
    await userStatus.setStatus("🟢", "Working");
  };

  const handlePause = async () => {
    await pause();
    await notifications.onPause();
  };

  const handleResume = async () => {
    await resume();
    await notifications.onResume();
    await userStatus.setStatus("🟢", "Working");
  };

  const confirmClockOut = async (drafts: TaskDraft[]) => {
    const tomorrow = workDateOffset(1);
    for (const draft of drafts) {
      await createTask({
        title: draft.title,
        priority: draft.priority,
        plannedFor: tomorrow,
      });
    }
    await clockOut();
    await notifications.onClockOut();
    await userStatus.clearStatus();
    setPlanVisible(false);
  };

  const isClockedIn =
    workSession != null && workSession.status !== "completed";

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {firstName ? `Hey ${firstName} 👋` : "Welcome 👋"}
        </Text>
        <Text className="text-gray-500 mb-6">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        <ClockCard
          workSession={workSession}
          sessions={sessions}
          breaks={breaks}
          canClockIn={canClockIn}
          onClockIn={handleClockIn}
          onPause={handlePause}
          onResume={handleResume}
          onClockOut={() => setPlanVisible(true)}
          error={error}
        />

        {/* Status picker — visible when clocked in */}
        {isClockedIn && (
          <View className="mb-4 -mt-2">
            <StatusPicker
              current={userStatus.status}
              onSelect={userStatus.setStatus}
            />
          </View>
        )}

        <PlanTomorrowModal
          visible={planVisible}
          onCancel={() => setPlanVisible(false)}
          onConfirm={confirmClockOut}
        />

        {/* Active task timers banner */}
        <ActiveTimersBanner
          tasks={tasks}
          runningTaskIds={taskTimer.runningTaskIds}
          totalSeconds={taskTimer.totalSeconds}
          onStop={taskTimer.stopTimer}
        />

        <FocusTimer tasks={tasks} />

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Text className="text-xl font-semibold text-gray-900 mb-1">
            Hourly Updates
          </Text>
          <Text className="text-gray-500 text-sm mb-4">
            Log a short note for each hour — you can fill these in as you go
            or at the end of the day (editable today only).
          </Text>
          <HourlyTimeline
            updates={updates}
            hours={sessionHours(workSession?.clock_in_at)}
            onSave={saveUpdate}
          />
        </View>
      </View>
    </ScrollView>
  );
}
