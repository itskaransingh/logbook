import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionProvider";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  employee: "Employee",
};

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "bg-yellow-100", text: "text-yellow-800" },
  admin: { bg: "bg-purple-100", text: "text-purple-700" },
  employee: { bg: "bg-indigo-50", text: "text-indigo-600" },
};

export function ProfileIcon() {
  const { session, profile } = useSession();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const role = profile?.role ?? "employee";
  const initials = (profile?.full_name ?? session?.user.email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleStyle = ROLE_STYLE[role] ?? ROLE_STYLE.employee;

  async function saveProfile() {
    if (!session?.user) return;
    setSaving(true);
    setMessage(null);
    await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", session.user.id);
    setSaving(false);
    setMessage("Saved");
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-indigo-600 items-center justify-center mr-4"
        accessibilityLabel="Profile"
      >
        <Text className="text-white text-xs font-bold">{initials}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
                {/* Handle bar */}
                <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-6" />

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-gray-900">
                    {profile?.full_name ?? "Profile"}
                  </Text>
                  <View className={`rounded-full px-3 py-1 ${roleStyle.bg}`}>
                    <Text className={`text-xs font-semibold ${roleStyle.text}`}>
                      {ROLE_LABEL[role]}
                    </Text>
                  </View>
                </View>

                {profile?.department && (
                  <Text className="text-sm text-gray-500 mb-4">
                    {profile.department}
                  </Text>
                )}

                <Text className="text-sm text-gray-400 mb-6">
                  {session?.user.email}
                </Text>

                {/* Name edit */}
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Display name
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-2"
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); setMessage(null); }}
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                />
                {message && (
                  <Text className="text-green-600 text-xs mb-2">{message}</Text>
                )}
                <TouchableOpacity
                  className={`rounded-xl py-3 mb-6 ${saving ? "bg-gray-200" : "bg-indigo-600 active:bg-indigo-700"}`}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  <Text className={`text-center font-semibold ${saving ? "text-gray-400" : "text-white"}`}>
                    {saving ? "Saving…" : "Save"}
                  </Text>
                </TouchableOpacity>

                {/* Sign out */}
                <TouchableOpacity
                  className="border border-red-200 rounded-xl py-4 active:bg-red-50"
                  onPress={() => { setOpen(false); supabase.auth.signOut(); }}
                >
                  <Text className="text-red-600 text-center font-semibold">
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
