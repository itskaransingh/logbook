/**
 * @fileoverview Today screen — the employee's home base.
 * Work clock (in/pause/resume/out), focus timer, and the hour-by-hour
 * timeline of updates for today.
 */

import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSession } from "@/context/SessionProvider";
import { useWorkSession } from "@/src/hooks/useWorkSession";
import { useHourlyUpdates } from "@/src/hooks/useHourlyUpdates";
import { useTasks } from "@/src/hooks/useTasks";
import ClockCard from "@/src/components/logbook/ClockCard";
import FocusTimer from "@/src/components/logbook/FocusTimer";
import HourlyTimeline from "@/src/components/logbook/HourlyTimeline";

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
    breaks,
    error,
    clockIn,
    pause,
    resume,
    clockOut,
  } = useWorkSession();
  const { updates, saveUpdate } = useHourlyUpdates();
  const { tasks } = useTasks();

  const firstName = profile?.full_name?.split(" ")[0];

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
          breaks={breaks}
          onClockIn={clockIn}
          onPause={pause}
          onResume={resume}
          onClockOut={clockOut}
          error={error}
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
