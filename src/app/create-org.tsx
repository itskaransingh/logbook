import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useSession } from "@/context/SessionProvider";
import { Organization } from "@/src/types/logbook";

function deriveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function CreateOrgScreen() {
  const router = useRouter();
  const { selectOrg } = useSession();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(text: string) {
    setName(text);
    if (!slugEdited) {
      setSlug(deriveSlug(text));
    }
  }

  function handleSlugChange(text: string) {
    setSlugEdited(true);
    setSlug(text.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  const slugValid = /^[a-z0-9]{2,50}$/.test(slug);
  const canSubmit = name.trim().length > 0 && slugValid && !loading;

  async function handleCreate() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("create_organization", {
      p_name: name.trim(),
      p_slug: slug,
    });

    if (rpcError) {
      setError(rpcError.message.replace(/^ERROR:\s*/i, ""));
      setLoading(false);
      return;
    }

    const org = data as Organization;
    selectOrg(org);
    setLoading(false);
    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-8 max-w-xl w-full self-center flex-1">
          <TouchableOpacity
            className="mb-6"
            onPress={() => router.back()}
          >
            <Text className="text-indigo-600 font-medium">← Back</Text>
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-gray-900 mb-1">
            Create Organization
          </Text>
          <Text className="text-gray-500 text-sm mb-8">
            Set up a workspace for your team.
          </Text>

          {/* Warning banner */}
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex-row">
            <Text className="text-amber-700 text-xs leading-5">
              The organization name and URL cannot be changed after creation.
              Choose carefully.
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-gray-100 p-5">
            {/* Org name */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-4"
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Atomnik, Malhar Comps'26"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
            />

            {/* Slug */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              URL Identifier
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-lg mb-1 overflow-hidden">
              <TextInput
                className="flex-1 p-3 text-gray-900"
                value={slug}
                onChangeText={handleSlugChange}
                placeholder="orgslug"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View className="px-3 bg-gray-50 border-l border-gray-200 h-full justify-center">
                <Text className="text-xs text-gray-400">.logbook</Text>
              </View>
            </View>
            {slug.length > 0 && !slugValid && (
              <Text className="text-xs text-red-500 mb-1">
                Must be 2–50 lowercase letters and numbers only.
              </Text>
            )}
            {slugValid && (
              <Text className="text-xs text-gray-400 mb-1">
                Members will log in as username@{slug}.logbook
              </Text>
            )}

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <Text className="text-red-700 text-sm text-center">{error}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            className={`mt-6 rounded-xl py-4 ${canSubmit ? "bg-indigo-600 active:bg-indigo-700" : "bg-gray-300"}`}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`text-center font-semibold ${canSubmit ? "text-white" : "text-gray-500"}`}>
                Create Organization
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
