/**
 * Modal shown when completing a task that exceeded its time estimate.
 * Displays the estimate vs actual breakdown and asks for a reason.
 */

import React, { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatDuration } from "../../lib/time";

const SUGGESTIONS = [
  "Scope expanded",
  "Blocked by dependency",
  "Underestimated complexity",
  "Debugging issues",
  "Waiting on review",
];

interface OvertimeReasonModalProps {
  visible: boolean;
  taskTitle: string;
  estimatedMinutes: number;
  actualSeconds: number;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function OvertimeReasonModal({
  visible,
  taskTitle,
  estimatedMinutes,
  actualSeconds,
  onCancel,
  onConfirm,
}: OvertimeReasonModalProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const overhead = actualSeconds - estimatedMinutes * 60;

  const confirm = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (saving) return;
    setReason("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancel}
    >
      <View className="flex-1 bg-black/40 items-center justify-center px-4">
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-md">
          <Text className="text-xl font-semibold text-gray-900 mb-1">
            Task took longer than expected
          </Text>
          <Text className="text-gray-500 text-sm mb-4" numberOfLines={2}>
            "{taskTitle}" exceeded its estimate.
          </Text>

          {/* Breakdown */}
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-600">Estimated</Text>
              <Text className="text-sm font-medium text-gray-900">
                {formatDuration(estimatedMinutes * 60)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-600">Actual</Text>
              <Text className="text-sm font-medium text-gray-900">
                {formatDuration(actualSeconds)}
              </Text>
            </View>
            <View className="border-t border-red-200 pt-2 flex-row justify-between">
              <Text className="text-sm font-semibold text-red-700">
                Overhead
              </Text>
              <Text className="text-sm font-semibold text-red-700">
                +{formatDuration(overhead)}
              </Text>
            </View>
          </View>

          {/* Suggestions */}
          <Text className="text-sm font-medium text-gray-600 mb-2">
            Why did it take extra time?
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                className={`rounded-full px-3 py-1.5 border ${
                  reason === s
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => setReason(s)}
              >
                <Text
                  className={`text-xs ${
                    reason === s ? "text-white" : "text-gray-700"
                  }`}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            className="border border-gray-200 rounded-lg p-3 text-gray-900 mb-4"
            value={reason}
            onChangeText={setReason}
            placeholder="Or type your own reason..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            className={`rounded-lg py-3 mb-2 ${
              saving || !reason.trim()
                ? "bg-gray-100"
                : "bg-indigo-600 active:bg-indigo-700"
            }`}
            onPress={confirm}
            disabled={saving || !reason.trim()}
          >
            <Text
              className={`text-center font-semibold ${
                saving || !reason.trim() ? "text-gray-400" : "text-white"
              }`}
            >
              {saving ? "Completing..." : "Complete Task"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-lg py-3"
            onPress={cancel}
            disabled={saving}
          >
            <Text className="text-center font-medium text-gray-500">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
