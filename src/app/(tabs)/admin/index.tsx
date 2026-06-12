/**
 * Admin dashboard: every team member (employees and other admins) with
 * live status, user presence (Slack-like), hours today, and weekly totals.
 * The signed-in admin's own row is excluded — their day lives on the Today tab.
 */

import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useEmployees } from "@/src/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import EmployeeCard from "@/src/components/logbook/EmployeeCard";
import { UserStatus } from "@/src/types/logbook";

export default function AdminDashboard() {
  const router = useRouter();
  const { employees, loading, error } = useEmployees();
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

  // Fetch all user statuses
  const refreshStatuses = useCallback(async () => {
    const { data } = await supabase.from("user_status").select("*");
    if (data) {
      const map: Record<string, UserStatus> = {};
      for (const s of data as UserStatus[]) {
        map[s.user_id] = s;
      }
      setStatuses(map);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStatuses();
      const timer = setInterval(refreshStatuses, 30000);
      return () => clearInterval(timer);
    }, [refreshStatuses])
  );

  const working = employees.filter((e) => e.today?.status === "active").length;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900">Team</Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-lg py-2 px-4 active:bg-blue-700"
            onPress={() => router.push("/admin/new-user")}
          >
            <Text className="text-white font-medium">+ Add Employee</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-500 mb-6">
          {employees.length} team members · {working} working now
        </Text>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm text-center">{error}</Text>
          </View>
        )}

        {!loading && employees.length === 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-8">
            <Text className="text-gray-400 text-center">
              No team members yet. Use "+ Add Employee" to create the first
              account and share the credentials.
            </Text>
          </View>
        )}

        {employees.map((e) => (
          <EmployeeCard
            key={e.profile.id}
            employee={e}
            userStatus={statuses[e.profile.id] ?? null}
            onPress={() => router.push(`/admin/${e.profile.id}`)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
