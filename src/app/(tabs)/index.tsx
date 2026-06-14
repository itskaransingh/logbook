/**
 * @fileoverview Today screen — the employee's home base.
 * Work clock (in/pause/resume/out), rotating motivational quote,
 * status picker, active task timers banner, focus timer, hourly updates,
 * and the Wrap My Day button (shown only when all today's tasks are approved).
 */

import React, { useState, useEffect, useRef } from "react";
import { ScrollView, Text, View, Modal, TouchableOpacity, Animated } from "react-native";
import { useSession } from "@/context/SessionProvider";
import { useWorkSession } from "@/src/hooks/useWorkSession";
import { useHourlyUpdates } from "@/src/hooks/useHourlyUpdates";
import { useTasks } from "@/src/hooks/useTasks";
import { useTaskTimer } from "@/src/hooks/useTaskTimer";
import { useUserStatus } from "@/src/hooks/useUserStatus";
import { useWorkNotifications } from "@/src/hooks/useWorkNotifications";
import { useDayWrap } from "@/src/hooks/useDayWrap";
import ClockCard from "@/src/components/logbook/ClockCard";
import FocusTimer from "@/src/components/logbook/FocusTimer";
import HourlyTimeline from "@/src/components/logbook/HourlyTimeline";
import PlanTomorrowModal, { TaskDraft } from "@/src/components/logbook/PlanTomorrowModal";
import ActiveTimersBanner from "@/src/components/logbook/ActiveTimersBanner";
import StatusPicker from "@/src/components/logbook/StatusPicker";
import { workDateOffset } from "@/src/lib/dates";
import { ConfettiReward } from "@/src/components/logbook/ConfettiReward";

const QUOTES = [
  "Small wins compound fast.",
  "Today's output becomes tomorrow's reputation.",
  "Focus now. Flex later.",
  "Make progress visible.",
  "One clean task at a time.",
  "Show up. Do the work. Repeat.",
  "The best time to start was yesterday. Now is fine.",
];

/** Hours from clock-in through the current hour (for today's session). */
const sessionHours = (clockInAt: string | undefined): number[] => {
  if (!clockInAt) return [];
  const start = new Date(clockInAt).getHours();
  const end = new Date().getHours();
  const hours: number[] = [];
  for (let h = start; h <= end; h++) hours.push(h);
  return hours;
};

function RotatingQuote() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [opacity]);

  return (
    <Animated.Text style={{ opacity }} className="text-sm text-indigo-500 italic mb-1">
      {QUOTES[index]}
    </Animated.Text>
  );
}

export default function TodayScreen() {
  const { profile, session } = useSession();
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
  const { wrap, hasApprovedAllTasks, wrapping, wrapUp } = useDayWrap(session?.user.id);

  const [planVisible, setPlanVisible] = useState(false);
  const [wrapConfirmVisible, setWrapConfirmVisible] = useState(false);
  const [wrapError, setWrapError] = useState<string | null>(null);
  const [wrapSuccess, setWrapSuccess] = useState(false);
  const [fullConfetti, setFullConfetti] = useState(false);

  // Fire full confetti when day wrap transitions pending → approved
  const prevWrapStatus = useRef<string | null>(null);
  useEffect(() => {
    if (wrap?.status === "approved" && prevWrapStatus.current === "pending") {
      setFullConfetti(true);
    }
    prevWrapStatus.current = wrap?.status ?? null;
  }, [wrap?.status]);

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
    setPlanVisible(false); // close immediately — don't wait on network
    const tomorrow = workDateOffset(1);
    await Promise.all([
      clockOut(),
      ...drafts.map((draft) =>
        createTask({ title: draft.title, priority: draft.priority, plannedFor: tomorrow })
      ),
    ]);
    notifications.onClockOut(); // fire-and-forget (local only)
    userStatus.clearStatus();   // fire-and-forget (non-blocking)
  };

  const handleWrapUp = async () => {
    setWrapError(null);
    const { error: err } = await wrapUp();
    setWrapConfirmVisible(false);
    if (err) {
      setWrapError(err);
    } else {
      setWrapSuccess(true);
      userStatus.clearStatus();   // fire-and-forget
      notifications.onClockOut(); // fire-and-forget
    }
  };

  const isClockedIn = workSession != null && workSession.status !== "completed";
  const alreadyWrapped = wrap?.status === "pending" || wrap?.status === "approved";
  const showWrapButton = hasApprovedAllTasks && !alreadyWrapped;

  return (
    <View className="flex-1">
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <Text className="text-2xl font-bold text-gray-900 mb-0.5">
          {firstName ? `Hey ${firstName} 👋` : "Welcome 👋"}
        </Text>
        <RotatingQuote />
        <Text className="text-gray-500 mb-6">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {/* Wrap success banner */}
        {alreadyWrapped && (
          <View className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-indigo-700 text-sm font-medium text-center">
              {wrap?.status === "approved"
                ? "Day approved. You kept the momentum alive. 🎉"
                : "Day wrapped. Awaiting co-founder approval…"}
            </Text>
          </View>
        )}

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

    {/* Wrap My Day sticky button — outside ScrollView so it truly sticks to bottom */}
    {showWrapButton && (
      <View className="absolute bottom-6 left-4 right-4">
        <TouchableOpacity
          className="bg-indigo-600 rounded-2xl py-4 shadow-lg active:bg-indigo-700"
          onPress={() => setWrapConfirmVisible(true)}
          disabled={wrapping}
        >
          <Text className="text-white text-center font-bold text-base">
            {wrapping ? "Wrapping up…" : "Wrap Up My Day"}
          </Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Full confetti on day wrap approval — above everything */}
    <ConfettiReward
      visible={fullConfetti}
      size="full"
      onDone={() => setFullConfetti(false)}
    />

    {/* Wrap Up confirmation modal */}
    <Modal
      visible={wrapConfirmVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setWrapConfirmVisible(false)}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Ready to wrap up your day?
          </Text>
          <Text className="text-gray-500 text-sm mb-6">
            You've completed all your tasks. This will send your work summary to the co-founders for approval and automatically clock you out.
          </Text>
          {wrapError && (
            <Text className="text-red-600 text-sm mb-4">{wrapError}</Text>
          )}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 border border-gray-200 rounded-xl py-3"
              onPress={() => setWrapConfirmVisible(false)}
            >
              <Text className="text-gray-700 text-center font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-indigo-600 rounded-xl py-3 active:bg-indigo-700"
              onPress={handleWrapUp}
            >
              <Text className="text-white text-center font-semibold">Yes, Wrap Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </View>
  );
}
