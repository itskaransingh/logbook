/**
 * Create an Org Member account. Owner/super_admin only.
 * Owner types username + name + role + password; the server assembles
 * username@orgslug.logbook and stores it in Supabase Auth.
 */

import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionProvider";
import { Role } from "@/src/types/logbook";

const generatePassword = (): string => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const ROLES: { value: Role; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function NewEmployee() {
  const router = useRouter();
  const { currentOrg, isSuperAdmin } = useSession();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const emailPreview = currentOrg
    ? `${cleanUsername || "username"}@${currentOrg.slug}.logbook`
    : "";
  const usernameValid = /^[a-z0-9]{2,30}$/.test(cleanUsername);

  const valid =
    usernameValid &&
    fullName.trim().length > 0 &&
    password.length >= 6 &&
    !!currentOrg;

  const submit = async () => {
    if (!valid || !currentOrg) return;
    setLoading(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke(
      "admin-create-user",
      {
        body: {
          username: cleanUsername,
          full_name: fullName.trim(),
          password,
          org_id: currentOrg.id,
          role,
        },
      }
    );
    setLoading(false);

    if (fnError) {
      let message = "Failed to create user";
      try {
        const body = await (fnError as any).context?.json?.();
        if (body?.error) message = body.error;
      } catch {
        // keep the generic message
      }
      setError(message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    setCreated({ email: emailPreview.replace("username", cleanUsername), password });
  };

  if (created) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <View className="px-4 py-6 max-w-2xl w-full self-center">
          <View className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-4">
            <Text className="text-green-800 text-lg font-semibold mb-2">
              ✓ Account created
            </Text>
            <Text className="text-green-700 mb-4">
              Share these credentials with the member — the password is not
              shown again.
            </Text>
            <View className="bg-white rounded-lg border border-green-200 p-4">
              <Text className="text-gray-500 text-sm">Email</Text>
              <Text className="text-gray-900 font-mono mb-3" selectable>
                {created.email}
              </Text>
              <Text className="text-gray-500 text-sm">Password</Text>
              <Text className="text-gray-900 font-mono" selectable>
                {created.password}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-3 active:bg-indigo-700"
            onPress={() => router.back()}
          >
            <Text className="text-white text-center font-semibold">
              Back to Team
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Text className="text-xl font-semibold text-gray-900 mb-6">
            New Member Account
          </Text>

          {/* Full name */}
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Full Name
          </Text>
          <TextInput
            className="border border-gray-200 rounded-lg p-4 text-gray-900 mb-4"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          {/* Username → email preview */}
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Username
          </Text>
          <TextInput
            className="border border-gray-200 rounded-lg p-4 text-gray-900 mb-1"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. gladwin"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-1">
            <Text className="text-xs text-gray-400">Login email</Text>
            <Text className="text-sm font-mono text-gray-700" selectable>
              {emailPreview}
            </Text>
          </View>
          {username.length > 0 && !usernameValid && (
            <Text className="text-xs text-red-500 mb-3">
              2–30 lowercase letters and numbers only.
            </Text>
          )}
          {usernameValid && <View className="mb-3" />}

          {/* Role */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Role</Text>
          <View className="flex-row gap-2 mb-4">
            {ROLES.filter((r) => isSuperAdmin || r.value === "employee").map((r) => {
              const active = role === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  className={`rounded-lg px-3 py-2 border ${active ? "bg-indigo-600 border-indigo-600" : "border-gray-200 bg-white"}`}
                  onPress={() => setRole(r.value)}
                >
                  <Text
                    className={`text-xs font-medium ${active ? "text-white" : "text-gray-600"}`}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Password */}
          <Text className="text-sm font-medium text-gray-700 mb-1">
            Temporary Password
          </Text>
          <View className="flex-row gap-2 mb-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg p-4 text-gray-900"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity
              className="bg-gray-100 border border-gray-300 rounded-lg px-4 justify-center active:bg-gray-200"
              onPress={() => setPassword(generatePassword())}
            >
              <Text className="text-gray-700 font-medium">Generate</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-gray-500 mb-4">
            Share this with the member; they sign in with it.
          </Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm text-center">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`rounded-xl py-4 ${loading || !valid ? "bg-gray-100" : "bg-indigo-600 active:bg-indigo-700"}`}
            onPress={submit}
            disabled={loading || !valid}
          >
            <Text
              className={`text-center font-semibold ${loading || !valid ? "text-gray-400" : "text-white"}`}
            >
              {loading ? "Creating…" : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
