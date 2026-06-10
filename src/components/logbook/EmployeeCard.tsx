/**
 * Admin dashboard row: team member name (with an Admin pill for admin
 * accounts), live status chip, hours today and this week. Tapping opens
 * the member detail screen.
 */

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { EmployeeOverview } from "../../hooks/useEmployees";
import { formatDuration, formatTime, workedSeconds } from "../../lib/time";

const STATUS_CHIPS = {
  active: { label: "Working", classes: "bg-green-100 text-green-700" },
  paused: { label: "On break", classes: "bg-amber-100 text-amber-700" },
  completed: { label: "Done for today", classes: "bg-gray-200 text-gray-600" },
  none: { label: "Not started", classes: "bg-gray-100 text-gray-500" },
} as const;

interface EmployeeCardProps {
  employee: EmployeeOverview;
  onPress: () => void;
}

export default function EmployeeCard({ employee, onPress }: EmployeeCardProps) {
  const { profile, today, weekWorkedSeconds } = employee;
  const chip = STATUS_CHIPS[today?.status ?? "none"];

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 active:bg-gray-50"
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <Text className="text-lg font-semibold text-gray-900">
            {profile.full_name || profile.username || "Unnamed"}
          </Text>
          {profile.role === "admin" && (
            <View className="rounded-full px-2 py-0.5 bg-indigo-100">
              <Text className="text-xs font-medium text-indigo-700">Admin</Text>
            </View>
          )}
        </View>
        <View className={`rounded-full px-3 py-1 ${chip.classes}`}>
          <Text className={`text-sm font-medium ${chip.classes}`}>
            {chip.label}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-6">
        <View>
          <Text className="text-xs text-gray-400 uppercase">Today</Text>
          <Text className="text-gray-800 font-medium">
            {today ? formatDuration(workedSeconds(today)) : "—"}
          </Text>
        </View>
        <View>
          <Text className="text-xs text-gray-400 uppercase">This week</Text>
          <Text className="text-gray-800 font-medium">
            {weekWorkedSeconds > 0 ? formatDuration(weekWorkedSeconds) : "—"}
          </Text>
        </View>
        {today && (
          <View>
            <Text className="text-xs text-gray-400 uppercase">Clocked in</Text>
            <Text className="text-gray-800 font-medium">
              {formatTime(today.clock_in_at)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
