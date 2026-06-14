/**
 * Admin dashboard: every team member (employees and other admins) with
 * live status, user presence (Slack-like), hours today, and weekly totals.
 * The signed-in admin's own row is excluded — their day lives on the Today tab.
 */

import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useEmployees } from "@/src/hooks/useEmployees";
import { useTaskApprovals } from "@/src/hooks/useTaskApprovals";
import { useDayWrapApprovals } from "@/src/hooks/useDayWrapApprovals";
import { useSession } from "@/context/SessionProvider";
import { supabase } from "@/lib/supabase";
import EmployeeCard from "@/src/components/logbook/EmployeeCard";
import { UserStatus } from "@/src/types/logbook";

export default function AdminDashboard() {
  const router = useRouter();
  const { isSuperAdmin } = useSession();
  const { employees, loading, error } = useEmployees();
  const { pendingTasks, approve } = useTaskApprovals();
  const { pendingWraps, approveDayWrap } = useDayWrapApprovals();
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
          <View className="flex-row gap-2">
            {isSuperAdmin && (
              <TouchableOpacity
                className="bg-amber-500 rounded-lg py-2 px-3 active:bg-amber-600"
                onPress={() => router.push("/admin/manage")}
              >
                <Text className="text-white font-medium text-sm">Manage</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="bg-indigo-600 rounded-lg py-2 px-4 active:bg-indigo-700"
              onPress={() => router.push("/admin/new-user")}
            >
              <Text className="text-white font-medium">+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-gray-500 mb-6">
          {employees.length} team members · {working} working now
        </Text>

        {/* Pending task approvals */}
        {pendingTasks.length > 0 && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-amber-800 uppercase tracking-widest mb-3">
              Pending Approvals · {pendingTasks.length}
            </Text>
            {pendingTasks.map((t) => (
              <View key={t.id} className="bg-white rounded-xl px-3 py-3 mb-2 border border-amber-100">
                <Text className="text-gray-900 text-sm font-medium">{t.title}</Text>
                {t.employee_name && (
                  <Text className="text-gray-500 text-xs mt-0.5">{t.employee_name}</Text>
                )}
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    className="flex-1 bg-green-600 rounded-lg py-1.5 active:bg-green-700"
                    onPress={() => approve(t.id)}
                  >
                    <Text className="text-white text-xs font-semibold text-center">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-red-100 rounded-lg py-1.5 active:bg-red-200"
                    onPress={() => router.push(`/admin/${t.user_id}`)}
                  >
                    <Text className="text-red-700 text-xs font-semibold text-center">Review →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending day wrap approvals */}
        {pendingWraps.length > 0 && (
          <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-semibold text-indigo-800 uppercase tracking-widest mb-3">
              Wrap-Up Requests · {pendingWraps.length}
            </Text>
            {pendingWraps.map((w) => (
              <View key={w.id} className="bg-white rounded-xl px-3 py-3 mb-2 border border-indigo-100">
                <Text className="text-gray-900 text-sm font-medium">
                  {w.employee_name ?? "Employee"} — {w.work_date}
                </Text>
                <TouchableOpacity
                  className="bg-indigo-600 rounded-lg py-1.5 mt-2 active:bg-indigo-700"
                  onPress={() => approveDayWrap(w.id)}
                >
                  <Text className="text-white text-xs font-semibold text-center">Approve Day Wrap</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm text-center">{error}</Text>
          </View>
        )}

        {!loading && employees.length === 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center">
            <Text className="text-sm font-semibold text-gray-700 mb-1 text-center">
              No team members yet
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              Use "+ Add" to create the first account and share the credentials.
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
