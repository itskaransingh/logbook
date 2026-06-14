/**
 * Super admin management screen: assign departments, assign admins to employees,
 * and toggle super admin's own work visibility.
 * Accessible only when isSuperAdmin.
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionProvider";
import { Profile, Role } from "@/src/types/logbook";

export default function ManageScreen() {
  const { isSuperAdmin, profile: selfProfile, session, currentOrg } = useSession();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showWorkToAdmins, setShowWorkToAdmins] = useState(
    selfProfile?.show_work_to_admins ?? false
  );

  const refresh = useCallback(async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("role")
      .order("full_name");
    const all = (data as Profile[]) ?? [];
    setProfiles(all);
    setAdmins(all.filter((p) => p.role === "admin" || p.role === "super_admin"));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isSuperAdmin && currentOrg) refresh();
    }, [refresh, isSuperAdmin, currentOrg])
  );

  if (!isSuperAdmin) return <Redirect href="/admin" />;

  async function updateDepartment(profileId: string, dept: string) {
    setSaving(profileId + "_dept");
    await supabase
      .from("profiles")
      .update({ department: dept.trim() || null })
      .eq("id", profileId);
    setSaving(null);
    await refresh();
  }

  async function updateDesignation(profileId: string, desg: string) {
    setSaving(profileId + "_desg");
    await supabase
      .from("profiles")
      .update({ designation: desg.trim() || null })
      .eq("id", profileId);
    setSaving(null);
    await refresh();
  }

  async function updateRole(profileId: string, role: Role) {
    setSaving(profileId + "_role");
    await supabase.from("profiles").update({ role }).eq("id", profileId);
    setSaving(null);
    await refresh();
  }

  async function updateAssignedAdmin(profileId: string, adminId: string | null) {
    setSaving(profileId + "_admin");
    await supabase
      .from("profiles")
      .update({ assigned_admin_id: adminId })
      .eq("id", profileId);
    setSaving(null);
    await refresh();
  }

  async function toggleVisibility(val: boolean) {
    setShowWorkToAdmins(val);
    await supabase
      .from("profiles")
      .update({ show_work_to_admins: val })
      .eq("id", session!.user.id);
  }

  const employees = profiles.filter((p) => p.role === "employee");
  const adminMembers = profiles.filter(
    (p) => (p.role === "admin" || p.role === "super_admin") && p.id !== session?.user.id
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        {/* Super admin visibility toggle */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            My Work Visibility
          </Text>
          <Text className="text-xs text-gray-500 mb-3">
            Show your work details (sessions, tasks, updates) to regular admins.
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-700">
              Visible to admins
            </Text>
            <Switch
              value={showWorkToAdmins}
              onValueChange={toggleVisibility}
              trackColor={{ true: "#4f46e5" }}
            />
          </View>
        </View>

        {/* Employees */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Employees ({employees.length})
        </Text>
        {employees.map((p) => (
          <UserRow
            key={p.id + (p.department ?? "") + (p.designation ?? "") + (p.assigned_admin_id ?? "") + p.role}
            profile={p}
            admins={admins}
            saving={saving}
            onSaveDepartment={updateDepartment}
            onSaveDesignation={updateDesignation}
            onSaveAdmin={updateAssignedAdmin}
            onSaveRole={updateRole}
          />
        ))}

        {/* Admins */}
        {adminMembers.length > 0 && (
          <>
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-3 mt-4">
              Admins ({adminMembers.length})
            </Text>
            {adminMembers.map((p) => (
              <UserRow
                key={p.id + (p.department ?? "") + (p.designation ?? "") + p.role}
                profile={p}
                admins={[]}
                saving={saving}
                onSaveDepartment={updateDepartment}
                onSaveDesignation={updateDesignation}
                onSaveAdmin={updateAssignedAdmin}
                onSaveRole={updateRole}
                hideAdminPicker
              />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const ROLES: Role[] = ["employee", "admin", "super_admin"];
const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee",
  admin: "Admin",
  super_admin: "Super Admin",
};

function UserRow({
  profile,
  admins,
  saving,
  onSaveDepartment,
  onSaveDesignation,
  onSaveAdmin,
  onSaveRole,
  hideAdminPicker,
}: {
  profile: Profile;
  admins: Profile[];
  saving: string | null;
  onSaveDepartment: (id: string, dept: string) => void;
  onSaveDesignation: (id: string, desg: string) => void;
  onSaveAdmin: (id: string, adminId: string | null) => void;
  onSaveRole: (id: string, role: Role) => void;
  hideAdminPicker?: boolean;
}) {
  const [dept, setDept] = useState(profile.department ?? "");
  const [desg, setDesg] = useState(profile.designation ?? "");
  const deptKey = profile.id + "_dept";
  const desgKey = profile.id + "_desg";
  const adminKey = profile.id + "_admin";
  const roleKey = profile.id + "_role";

  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
      <Text className="text-base font-medium text-gray-900">
        {profile.full_name ?? profile.username ?? "—"}
      </Text>

      {/* Role picker */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        {ROLES.map((r) => {
          const active = profile.role === r;
          return (
            <TouchableOpacity
              key={r}
              className={`rounded-lg px-3 py-1.5 border ${active ? "bg-indigo-600 border-indigo-600" : "border-gray-200 bg-white"}`}
              onPress={() => !active && onSaveRole(profile.id, r)}
              disabled={active || saving === roleKey}
            >
              <Text className={`text-xs font-medium ${active ? "text-white" : "text-gray-600"}`}>
                {ROLE_LABEL[r]}
              </Text>
            </TouchableOpacity>
          );
        })}
        {saving === roleKey && (
          <ActivityIndicator size="small" color="#4f46e5" />
        )}
      </View>

      {/* Department */}
      <View className="flex-row items-center gap-2 mb-2">
        <TextInput
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          value={dept}
          onChangeText={setDept}
          placeholder="Department (e.g. Design)"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          className={`rounded-lg px-3 py-2 ${saving === deptKey ? "bg-gray-200" : "bg-indigo-600 active:bg-indigo-700"}`}
          onPress={() => onSaveDepartment(profile.id, dept)}
          disabled={saving === deptKey}
        >
          <Text className={`text-xs font-semibold ${saving === deptKey ? "text-gray-400" : "text-white"}`}>
            {saving === deptKey ? "…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Designation */}
      <View className="flex-row items-center gap-2 mb-2">
        <TextInput
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          value={desg}
          onChangeText={setDesg}
          placeholder="Designation (e.g. Senior Engineer)"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          className={`rounded-lg px-3 py-2 ${saving === desgKey ? "bg-gray-200" : "bg-indigo-600 active:bg-indigo-700"}`}
          onPress={() => onSaveDesignation(profile.id, desg)}
          disabled={saving === desgKey}
        >
          <Text className={`text-xs font-semibold ${saving === desgKey ? "text-gray-400" : "text-white"}`}>
            {saving === desgKey ? "…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin assignment */}
      {!hideAdminPicker && admins.length > 0 && (
        <View>
          <Text className="text-xs text-gray-500 mb-1">Assigned admin</Text>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              className={`rounded-lg px-3 py-1.5 border ${!profile.assigned_admin_id ? "bg-indigo-600 border-indigo-600" : "border-gray-200 bg-white"}`}
              onPress={() => onSaveAdmin(profile.id, null)}
              disabled={saving === adminKey}
            >
              <Text className={`text-xs font-medium ${!profile.assigned_admin_id ? "text-white" : "text-gray-600"}`}>
                None
              </Text>
            </TouchableOpacity>
            {admins.map((a) => (
              <TouchableOpacity
                key={a.id}
                className={`rounded-lg px-3 py-1.5 border ${profile.assigned_admin_id === a.id ? "bg-indigo-600 border-indigo-600" : "border-gray-200 bg-white"}`}
                onPress={() => onSaveAdmin(profile.id, a.id)}
                disabled={saving === adminKey}
              >
                <Text className={`text-xs font-medium ${profile.assigned_admin_id === a.id ? "text-white" : "text-gray-600"}`}>
                  {a.full_name ?? a.username ?? a.id.slice(0, 6)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
