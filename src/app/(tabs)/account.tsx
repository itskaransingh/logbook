/**
 * @fileoverview Account screen
 * Shows the signed-in user's name, email, and role, lets them update
 * their display name, and signs them out.
 */

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSession } from "@/context/SessionProvider";

export default function Account() {
  const { session, profile, isAdmin } = useSession();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateProfile() {
    if (!session?.user) return;
    setUpdating(true);
    setMessage(null);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", session.user.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Profile updated");
    }
    setUpdating(false);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-gray-900">
              Profile
            </Text>
            <View
              className={`rounded-full px-3 py-1 ${
                isAdmin ? "bg-purple-100" : "bg-blue-100"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isAdmin ? "text-purple-700" : "text-blue-700"
                }`}
              >
                {isAdmin ? "Admin" : "Employee"}
              </Text>
            </View>
          </View>

          <Text className="text-base font-medium text-gray-700 mb-2">
            Email
          </Text>
          <View className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
            <Text className="text-gray-500">{session?.user.email}</Text>
          </View>

          <Text className="text-base font-medium text-gray-700 mb-2">
            Full Name
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 text-gray-900 mb-4"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />

          {message && (
            <Text className="text-green-700 text-sm mb-3">{message}</Text>
          )}
          {error && <Text className="text-red-600 text-sm mb-3">{error}</Text>}

          <TouchableOpacity
            className={`rounded-lg py-3 ${
              updating ? "bg-gray-300" : "bg-blue-600 active:bg-blue-700"
            }`}
            onPress={updateProfile}
            disabled={updating}
          >
            <Text
              className={`text-center font-semibold ${
                updating ? "text-gray-500" : "text-white"
              }`}
            >
              {updating ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-white border border-red-200 rounded-2xl py-4 active:bg-red-50"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-red-600 text-center font-semibold">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
