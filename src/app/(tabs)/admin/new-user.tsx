/**
 * Create an employee account (admin only). Calls the admin-create-user
 * edge function, which verifies the caller's admin role server-side.
 * New accounts are always employees; admins are promoted via SQL/Studio.
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

const generatePassword = (): string => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

export default function NewEmployee() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke(
      "admin-create-user",
      { body: { email: email.trim(), password, full_name: fullName.trim() } }
    );
    setLoading(false);

    // supabase-js surfaces non-2xx as FunctionsHttpError; the JSON body
    // carries our message.
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
    setCreated({ email: email.trim(), password });
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
              Share these credentials with the employee now — the password is
              not shown again.
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
            className="bg-blue-600 rounded-lg py-3 active:bg-blue-700"
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

  const valid =
    email.trim().length > 3 && fullName.trim().length > 0 && password.length >= 6;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-6 max-w-2xl w-full self-center">
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Text className="text-xl font-semibold text-gray-900 mb-6">
            New Employee Account
          </Text>

          <Text className="text-base font-medium text-gray-700 mb-2">
            Full Name
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 text-gray-900 mb-4"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-base font-medium text-gray-700 mb-2">
            Email Address
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-4 text-gray-900 mb-4"
            value={email}
            onChangeText={setEmail}
            placeholder="jane@company.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text className="text-base font-medium text-gray-700 mb-2">
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
            You'll share this with the employee; they sign in with it.
          </Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm text-center">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`rounded-lg py-4 ${
              loading || !valid ? "bg-gray-300" : "bg-blue-600 active:bg-blue-700"
            }`}
            onPress={submit}
            disabled={loading || !valid}
          >
            <Text
              className={`text-center font-semibold ${
                loading || !valid ? "text-gray-500" : "text-white"
              }`}
            >
              {loading ? "Creating..." : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
