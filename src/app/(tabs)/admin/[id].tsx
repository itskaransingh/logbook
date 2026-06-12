/**
 * Admin team-member detail: pick a day, see all sessions for the day
 * (with resume for completed ones), hourly timeline, user status,
 * task list with comments and overtime reasons.
 */

import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useHourlyUpdates } from "@/src/hooks/useHourlyUpdates";
import { useTasks } from "@/src/hooks/useTasks";
import { useUserStatus } from "@/src/hooks/useUserStatus";
import { useTaskComments } from "@/src/hooks/useTaskComments";
import HourlyTimeline from "@/src/components/logbook/HourlyTimeline";
import TaskItem from "@/src/components/logbook/TaskItem";
import TaskForm from "@/src/components/logbook/TaskForm";
import TaskComments from "@/src/components/logbook/TaskComments";
import { Profile, WorkSession } from "@/src/types/logbook";
import { formatWorkDate, localWorkDate, workDateOffset } from "@/src/lib/dates";
import {
  formatDuration,
  formatTime,
  workedSecondsOf,
  breakSecondsOf,
} from "@/src/lib/time";

const STATUS_LABELS = {
  active: "Working",
  paused: "On break",
  completed: "Completed",
} as const;

/** Inline comment hook per-task: manages comments for currently expanded task. */
function useExpandedComments() {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const commentsHook = useTaskComments(expandedTaskId);
  return { expandedTaskId, setExpandedTaskId, ...commentsHook };
}

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workDate, setWorkDate] = useState(localWorkDate());
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [sessionBreaks, setSessionBreaks] = useState<
    Record<string, import("@/src/types/logbook").SessionBreak[]>
  >({});
  const [showAssign, setShowAssign] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const { updates } = useHourlyUpdates(id, workDate);
  const { tasks, upcoming, createTask, setStatus } = useTasks(id);
  const { status: userStatus } = useUserStatus(id);
  const {
    expandedTaskId,
    setExpandedTaskId,
    comments,
    addComment,
  } = useExpandedComments();

  const refresh = useCallback(async () => {
    if (!id) return;
    const [profileRes, sessionsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", id)
        .eq("work_date", workDate)
        .order("clock_in_at", { ascending: true }),
    ]);
    setEmployee((profileRes.data as Profile) ?? null);
    const sessionList = (sessionsRes.data as WorkSession[]) ?? [];
    setSessions(sessionList);

    // Fetch breaks for all sessions
    if (sessionList.length > 0) {
      const ids = sessionList.map((s) => s.id);
      const { data: breaks } = await supabase
        .from("session_breaks")
        .select("*")
        .in("session_id", ids)
        .order("started_at");
      const grouped: Record<string, import("@/src/types/logbook").SessionBreak[]> = {};
      for (const b of (breaks as import("@/src/types/logbook").SessionBreak[]) ?? []) {
        if (!grouped[b.session_id]) grouped[b.session_id] = [];
        grouped[b.session_id].push(b);
      }
      setSessionBreaks(grouped);
    } else {
      setSessionBreaks({});
    }
  }, [id, workDate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 30000);
      return () => clearInterval(timer);
    }, [refresh])
  );

  const isToday = workDate === localWorkDate();

  const handleResumeSession = async (sessionId: string) => {
    setResumeError(null);
    const { error } = await supabase.rpc("admin_resume_session", {
      p_session_id: sessionId,
    });
    if (error) setResumeError(error.message);
    await refresh();
  };

  // Compute hours for timeline
  const hoursWithData = updates.map((u) => u.hour);
  const hourSet = new Set<number>(hoursWithData);
  for (const s of sessions) {
    const start = new Date(s.clock_in_at).getHours();
    const end = (s.clock_out_at ? new Date(s.clock_out_at) : new Date()).getHours();
    for (let h = start; h <= end; h++) hourSet.add(h);
  }
  const hours = [...hourSet].sort((a, b) => a - b);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{ title: employee?.full_name || "Team member" }}
      />
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        {/* User status */}
        {userStatus && (
          <View className="flex-row items-center gap-2 bg-white rounded-lg border border-gray-100 px-4 py-2 mb-4">
            <Text className="text-lg">{userStatus.emoji}</Text>
            <Text className="text-sm text-gray-700">{userStatus.label}</Text>
            <Text className="text-xs text-gray-400 ml-auto">Status</Text>
          </View>
        )}

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

        {/* Session summaries — one card per session */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Work Sessions
            {sessions.length > 1 && (
              <Text className="text-sm font-normal text-gray-400">
                {" "}· {sessions.length} sessions
              </Text>
            )}
          </Text>

          {sessions.length === 0 ? (
            <Text className="text-gray-400">No sessions on this day</Text>
          ) : (
            sessions.map((s, i) => {
              const br = sessionBreaks[s.id] ?? [];
              const worked = workedSecondsOf(s, br);
              return (
                <View
                  key={s.id}
                  className={`${
                    i > 0 ? "border-t border-gray-100 pt-3 mt-3" : ""
                  }`}
                >
                  <View className="flex-row flex-wrap gap-4 mb-2">
                    <View>
                      <Text className="text-xs text-gray-400 uppercase">
                        Status
                      </Text>
                      <Text className="text-gray-800 font-medium">
                        {STATUS_LABELS[s.status]}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-400 uppercase">
                        Worked
                      </Text>
                      <Text className="text-gray-800 font-medium">
                        {formatDuration(worked)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-400 uppercase">
                        Breaks
                      </Text>
                      <Text className="text-gray-800 font-medium">
                        {formatDuration(breakSecondsOf(br))}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-400 uppercase">
                        In
                      </Text>
                      <Text className="text-gray-800 font-medium">
                        {formatTime(s.clock_in_at)}
                      </Text>
                    </View>
                    {s.clock_out_at && (
                      <View>
                        <Text className="text-xs text-gray-400 uppercase">
                          Out
                        </Text>
                        <Text className="text-gray-800 font-medium">
                          {formatTime(s.clock_out_at)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Resume button */}
                  {s.status === "completed" && isToday && (
                    <TouchableOpacity
                      className="bg-blue-600 rounded-lg py-2 px-4 active:bg-blue-700 mt-1"
                      onPress={() => handleResumeSession(s.id)}
                    >
                      <Text className="text-white text-center font-medium text-sm">
                        🔄 Resume This Session
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          {resumeError && (
            <Text className="text-red-600 text-sm mt-2">{resumeError}</Text>
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
            <Text className="text-gray-400">
              No updates logged on this day
            </Text>
          )}
        </View>

        {/* Tasks + assign + comments */}
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
              <View key={t.id}>
                <TaskItem
                  task={t}
                  onSetStatus={async (task, status) => {
                    await setStatus(task, status);
                  }}
                />
                {/* Overtime reason */}
                {t.overtime_reason && (
                  <View className="ml-8 -mt-1 mb-1 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <Text className="text-xs text-red-700">
                      ⏰ Overtime reason: {t.overtime_reason}
                    </Text>
                  </View>
                )}
                {/* Comments */}
                <View className="ml-8 mb-2">
                  <TaskComments
                    comments={expandedTaskId === t.id ? comments : []}
                    onAdd={addComment}
                    canComment={true}
                  />
                  {expandedTaskId !== t.id && (
                    <TouchableOpacity
                      onPress={() => setExpandedTaskId(t.id)}
                    >
                      <Text className="text-xs text-gray-400 mt-1">
                        💬 View / add comments
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
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
