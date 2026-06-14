import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionProvider";
import { Organization } from "@/src/types/logbook";

export default function OrgPickerScreen() {
  const router = useRouter();
  const { orgs, selectOrg, session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSelectOrg(org: Organization) {
    selectOrg(org);
    router.replace("/(tabs)");
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-10 max-w-xl w-full self-center">
        <View className="items-center mb-10">
          <View className="w-14 h-14 bg-gray-900 rounded-2xl items-center justify-center mb-5">
            <Text className="text-indigo-400 font-black text-2xl">L</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
            Your Organizations
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            Select an org to enter, or create a new one.
          </Text>
        </View>

        {orgs.length === 0 ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center mb-4">
            <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mb-4">
              <Text className="text-gray-400 text-xl font-bold">+</Text>
            </View>
            <Text className="text-base font-semibold text-gray-700 mb-1 text-center">
              No organizations yet
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              Create your first org to get started.
            </Text>
          </View>
        ) : (
          <View className="mb-4">
            {orgs.map((org) => (
              <TouchableOpacity
                key={org.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 flex-row items-center active:bg-gray-50"
                onPress={() => handleSelectOrg(org)}
              >
                <View className="w-10 h-10 rounded-xl bg-gray-900 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-indigo-400">
                    {org.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {org.name}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {org.slug}.logbook
                  </Text>
                </View>
                <Text className="text-gray-300 text-lg">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          className="bg-indigo-600 rounded-xl py-3.5 mb-3 active:bg-indigo-700"
          onPress={() => router.push("/create-org")}
        >
          <Text className="text-white text-center font-semibold">
            + Create New Organization
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="py-3 items-center"
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <Text className="text-sm text-gray-400">
            {signingOut ? "Signing out…" : "Sign out"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
