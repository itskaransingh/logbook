/**
 * Clock in / pause / resume / clock out card with live elapsed readouts.
 * Supports multiple sessions per day — after clocking out, the user can
 * clock in again. Shows session count when > 1. The ticking counters are
 * display-only; stored times are server-side.
 */

import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SessionBreak, WorkSession } from "../../types/logbook";
import {
  breakSecondsOf,
  formatClock,
  formatTime,
  workedSecondsOf,
} from "../../lib/time";

interface ClockCardProps {
  workSession: WorkSession | null;
  /** All sessions today (for multi-session display). */
  sessions?: WorkSession[];
  breaks: SessionBreak[];
  canClockIn: boolean;
  onClockIn: () => void;
  onPause: () => void;
  onResume: () => void;
  onClockOut: () => void;
  error: string | null;
}

const Button = ({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary" | "danger";
}) => {
  const bg =
    variant === "primary"
      ? "bg-indigo-600 active:bg-indigo-700"
      : variant === "danger"
      ? "bg-red-600 active:bg-red-700"
      : "bg-gray-100 active:bg-gray-200 border border-gray-300";
  const text = variant === "secondary" ? "text-gray-800" : "text-white";
  return (
    <TouchableOpacity
      className={`flex-1 rounded-lg py-4 px-4 ${bg}`}
      onPress={onPress}
    >
      <Text className={`text-center font-semibold ${text}`}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function ClockCard({
  workSession,
  sessions = [],
  breaks,
  canClockIn,
  onClockIn,
  onPause,
  onResume,
  onClockOut,
  error,
}: ClockCardProps) {
  // 1s tick to keep the elapsed readouts moving while clocked in.
  const [, setTick] = useState(0);
  const running = workSession != null && workSession.status !== "completed";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const status = workSession?.status ?? "none";
  const sessionCount = sessions.length;

  const statusChip =
    status === "active"
      ? { label: "Working", classes: "bg-green-100 text-green-700" }
      : status === "paused"
      ? { label: "On break", classes: "bg-amber-100 text-amber-700" }
      : status === "completed"
      ? { label: "Clocked Out", classes: "bg-gray-200 text-gray-600" }
      : { label: "Not started", classes: "bg-gray-100 text-gray-500" };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-semibold text-gray-900">Work Clock</Text>
          {sessionCount > 1 && (
            <View className="rounded-full px-2 py-0.5 bg-gray-100">
              <Text className="text-xs font-medium text-gray-500">
                Session {sessionCount}
              </Text>
            </View>
          )}
        </View>
        <View className={`rounded-full px-3 py-1 ${statusChip.classes}`}>
          <Text className={`text-sm font-medium ${statusChip.classes}`}>
            {statusChip.label}
          </Text>
        </View>
      </View>

      {workSession && running ? (
        <View className="mb-5">
          <Text className="text-4xl font-bold text-gray-900 text-center mb-1">
            {formatClock(workedSecondsOf(workSession, breaks))}
          </Text>
          <Text className="text-gray-500 text-center text-sm">
            worked since {formatTime(workSession.clock_in_at)}
            {breaks.length > 0 &&
              ` · breaks ${formatClock(breakSecondsOf(breaks))}`}
          </Text>
        </View>
      ) : workSession?.status === "completed" ? (
        <View className="mb-5">
          <Text className="text-2xl font-bold text-gray-600 text-center mb-1">
            {formatClock(workedSecondsOf(workSession, breaks))}
          </Text>
          <Text className="text-gray-500 text-center text-sm">
            {formatTime(workSession.clock_in_at)} –{" "}
            {workSession.clock_out_at
              ? formatTime(workSession.clock_out_at)
              : ""}
          </Text>
        </View>
      ) : (
        <Text className="text-gray-500 text-center mb-5">
          Clock in to start your workday
        </Text>
      )}

      {error && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <Text className="text-red-700 text-sm text-center">{error}</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        {canClockIn && status === "none" && (
          <Button label="Clock In" onPress={onClockIn} variant="primary" />
        )}
        {canClockIn && status === "completed" && (
          <Button
            label="Clock In Again"
            onPress={onClockIn}
            variant="primary"
          />
        )}
        {status === "active" && (
          <>
            <Button label="Pause" onPress={onPause} variant="secondary" />
            <Button label="Clock Out" onPress={onClockOut} variant="danger" />
          </>
        )}
        {status === "paused" && (
          <>
            <Button label="Resume" onPress={onResume} variant="primary" />
            <Button label="Clock Out" onPress={onClockOut} variant="danger" />
          </>
        )}
      </View>
    </View>
  );
}
