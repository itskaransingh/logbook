/**
 * @fileoverview Sign-in screen
 * Logbook has no public signup: accounts are created by admins, so this
 * screen only signs in with provided credentials. Errors render inline
 * (Alert.alert is a no-op on web, our primary platform).
 */

import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { Stack, useRouter } from "expo-router";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithEmail() {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Invalid email or password"
          : error.message
      );
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <Stack.Screen options={{ title: "Logbook" }} />

        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-12">
            <View className="w-14 h-14 bg-gray-900 rounded-2xl items-center justify-center mb-5">
              <Text className="text-indigo-400 font-black text-2xl">L</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900 tracking-tight mb-2 text-center">
              Logbook
            </Text>
            <Text className="text-gray-500 text-center leading-6">
              Sign in with the credentials your admin gave you
            </Text>
          </View>

          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Sign In
            </Text>

            <View className="mb-4">
              <Text className="text-base font-medium text-gray-700 mb-2">
                Email Address
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-4 text-base text-gray-900 bg-white"
                onChangeText={setEmail}
                value={email}
                placeholder="your@email.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6">
              <Text className="text-base font-medium text-gray-700 mb-2">
                Password
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-4 text-base text-gray-900 bg-white"
                onChangeText={setPassword}
                value={password}
                secureTextEntry={true}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                onSubmitEditing={signInWithEmail}
              />
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <Text className="text-red-700 text-sm text-center">
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`rounded-xl py-4 px-6 ${
                loading || !email || !password
                  ? "bg-gray-100"
                  : "bg-indigo-600 active:bg-indigo-700"
              }`}
              onPress={signInWithEmail}
              disabled={loading || !email || !password}
            >
              <Text
                className={`text-center font-semibold ${
                  loading || !email || !password
                    ? "text-gray-400"
                    : "text-white"
                }`}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-indigo-50 rounded-xl border border-indigo-100 p-4"
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text className="text-indigo-700 text-sm text-center leading-5">
              New here?{" "}
              <Text className="font-semibold">Create an account</Text>
              {" "}to set up your organization.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
