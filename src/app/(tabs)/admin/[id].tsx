/**
 * Admin team-member detail (employees and other admins): pick a day, see
 * the session summary, hourly timeline (read-only), and the member's task
 * list with an assign form.
 */

import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useHourlyUpdates } from "@/src/hooks/useHourlyUpdates";
import { useTasks } from "@/src/hooks/useTasks";
import HourlyTimeline from "@/src/components/logbook/HourlyTimeline";
import TaskItem from "@/src/components/logbook/TaskItem";
import TaskForm from "@/src/components/logbook/TaskForm";
import { Profile, SessionSummary } from "@/src/types/logbook";
import { formatWorkDate, localWorkDate, workDateOffset } from "@/src/lib/dates";
import { formatDuration, formatTime, workedSeconds } from "@/src/lib/time";

const STATUS_LABELS = {
  active: "Working",
  paused: "On break",
  completed: "Completed",
} as const;

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workDate, setWorkDate] = useState(localWorkDate());
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const { updates } = useHourlyUpdates(id, workDate);
  const { tasks, upcoming, createTask, setStatus } = useTasks(id);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [profileRes, summaryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("session_summaries")
        .select("*")
        .eq("user_id", id)
        .eq("work_date", workDate)
        .maybeSingle(),
    ]);
    setEmployee((profileRes.data as Profile) ?? null);
    setSummary((summaryRes.data as SessionSummary) ?? null);
  }, [id, workDate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 30000);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const isToday = workDate === localWorkDate();
  // All hours that have data, plus the worked span for today.
  const hoursWithData = updates.map((u) => u.hour);
  const spanStart = summary ? new Date(summary.clock_in_at).getHours() : null;
  const spanEnd = summary
    ? (summary.clock_out_at ? new Date(summary.clock_out_at) : new Date()).getHours()
    : null;
  const hourSet = new Set<number>(hoursWithData);
  if (spanStart != null && spanEnd != null) {
    for (let h = spanStart; h <= spanEnd; h++) hourSet.add(h);
  }
  const hours = [...hourSet].sort((a, b) => a - b);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{ title: employee?.full_name || "Team member" }}
      />
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        {/* Date pager */}
        <View className="flex-row items-center justify-between bg-white rounded-2xl border border-gray-100 p-3 mb-4">
          <TouchableOpacity
            className="py-2 px-4 rounded-lg bg-gray-100 active:bg-gray-200"
            onPress={() => setWorkDate(workDateOffset(-1, workDate))}
          >
            <Text className="text-gray-700 font-medium">← Prev</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-gray-900">
            {isToday ? "Today" : formatWorkDate(workDate)}
          </Text>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${
              isToday ? "bg-gray-50" : "bg-gray-100 active:bg-gray-200"
            }`}
            onPress={() => setWorkDate(workDateOffset(1, workDate))}
            disabled={isToday}
          >
            <Text
              className={`font-medium ${
                isToday ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Session summary */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Work Session
          </Text>
          {summary ? (
            <View className="flex-row flex-wrap gap-6">
              <View>
                <Text className="text-xs text-gray-400 uppercase">Status</Text>
                <Text className="text-gray-800 font-medium">
                  {STATUS_LABELS[summary.status]}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400 uppercase">Worked</Text>
                <Text className="text-gray-800 font-medium">
                  {formatDuration(workedSeconds(summary))}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400 uppercase">Breaks</Text>
                <Text className="text-gray-800 font-medium">
                  {formatDuration(summary.break_seconds)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-400 uppercase">In</Text>
                <Text className="text-gray-800 font-medium">
                  {formatTime(summary.clock_in_at)}
                </Text>
              </View>
              {summary.clock_out_at && (
                <View>
                  <Text className="text-xs text-gray-400 uppercase">Out</Text>
                  <Text className="text-gray-800 font-medium">
                    {formatTime(summary.clock_out_at)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-gray-400">No session on this day</Text>
          )}
        </View>

        {/* Hourly updates (read-only) */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Hourly Updates
          </Text>
          {hours.length > 0 ? (
            <HourlyTimeline updates={updates} hours={hours} />
          ) : (
            <Text className="text-gray-400">No updates logged on this day</Text>
          )}
        </View>

        {/* Tasks + assign */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-gray-900">
              Current Tasks
            </Text>
            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-2 px-3 active:bg-blue-700"
              onPress={() => setShowAssign((s) => !s)}
            >
              <Text className="text-white font-medium">
                {showAssign ? "Close" : "Assign Task"}
              </Text>
            </TouchableOpacity>
          </View>

          {showAssign && (
            <View className="mb-4">
              <TaskForm
                submitLabel="Assign Task"
                showPlanDate
                onSubmit={async (input) => {
                  const err = await createTask(input);
                  if (!err) setShowAssign(false);
                  return err;
                }}
              />
            </View>
          )}

          {tasks.length > 0 ? (
            tasks.map((t) => (
              <TaskItem key={t.id} task={t} onSetStatus={setStatus} />
            ))
          ) : (
            <Text className="text-gray-400">No open tasks</Text>
          )}

          {upcoming.length > 0 && (
            <View className="mt-5">
              <Text className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Tomorrow's Plan ({upcoming.length})
              </Text>
              {upcoming.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
