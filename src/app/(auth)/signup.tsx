import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    fullName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 6;

  async function handleSignUp() {
    if (!valid) return;
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "An account with this email already exists."
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    // SessionProvider will detect the new session and route to org-picker
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10">
            <View className="w-14 h-14 bg-gray-900 rounded-2xl items-center justify-center mb-5">
              <Text className="text-indigo-400 font-black text-2xl">L</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900 tracking-tight mb-1 text-center">
              Create Account
            </Text>
            <Text className="text-gray-500 text-sm text-center">
              Sign up to create and manage organizations.
            </Text>
          </View>

          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Full Name
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 text-gray-900 mb-4"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Doe"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">
              Email Address
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 text-gray-900 mb-4"
              value={email}
              onChangeText={setEmail}
              placeholder="jane@company.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">
              Password
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 text-gray-900 mb-6"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
            />

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-700 text-sm text-center">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className={`rounded-xl py-4 ${valid && !loading ? "bg-indigo-600 active:bg-indigo-700" : "bg-gray-100"}`}
              onPress={handleSignUp}
              disabled={!valid || loading}
            >
              <Text
                className={`text-center font-semibold ${valid && !loading ? "text-white" : "text-gray-400"}`}
              >
                {loading ? "Creating account…" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="items-center py-2"
            onPress={() => router.back()}
          >
            <Text className="text-indigo-600 text-sm">
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
