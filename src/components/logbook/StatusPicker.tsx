/**
 * Slack-like status picker: preset options + custom. Shown inline on
 * the Today screen when clocked in.
 */

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { STATUS_PRESETS } from "../../hooks/useUserStatus";
import { UserStatus } from "../../types/logbook";

interface StatusPickerProps {
  current: UserStatus | null;
  onSelect: (emoji: string, label: string) => Promise<string | null>;
}

export default function StatusPicker({ current, onSelect }: StatusPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const select = async (emoji: string, label: string) => {
    setSaving(true);
    await onSelect(emoji, label);
    setSaving(false);
    setExpanded(false);
    setCustomLabel("");
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-3"
        onPress={() => setExpanded(true)}
      >
        <Text className="text-base">{current?.emoji ?? "🟢"}</Text>
        <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
          {current?.label ?? "Working"}
        </Text>
        <Text className="text-xs text-gray-400">Change ›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
      <Text className="text-sm font-medium text-gray-600 mb-2">
        Set your status
      </Text>
      <View className="gap-1 mb-2">
        {STATUS_PRESETS.map((preset) => {
          const active =
            current?.emoji === preset.emoji && current?.label === preset.label;
          return (
            <TouchableOpacity
              key={preset.label}
              className={`flex-row items-center gap-2 rounded-lg px-3 py-2 ${
                active ? "bg-indigo-50" : "active:bg-gray-100"
              }`}
              onPress={() => select(preset.emoji, preset.label)}
              disabled={saving}
            >
              <Text className="text-base">{preset.emoji}</Text>
              <Text
                className={`text-sm ${
                  active ? "text-indigo-700 font-medium" : "text-gray-700"
                }`}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom status */}
      <View className="flex-row items-center gap-2">
        <Text className="text-base">✍️</Text>
        <TextInput
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          value={customLabel}
          onChangeText={setCustomLabel}
          placeholder="Custom status..."
          placeholderTextColor="#9CA3AF"
          maxLength={100}
          onSubmitEditing={() => {
            if (customLabel.trim()) select("✍️", customLabel.trim());
          }}
        />
        {customLabel.trim() ? (
          <TouchableOpacity
            className="bg-indigo-600 rounded-lg px-3 py-2"
            onPress={() => select("✍️", customLabel.trim())}
            disabled={saving}
          >
            <Text className="text-white text-sm font-medium">Set</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        className="mt-2 py-1"
        onPress={() => {
          setExpanded(false);
          setCustomLabel("");
        }}
      >
        <Text className="text-xs text-gray-400 text-center">Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
