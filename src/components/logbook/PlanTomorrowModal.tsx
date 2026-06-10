/**
 * Clock-out interstitial: jot down a plan of action for tomorrow before
 * ending the day. Drafts are kept locally and handed to the parent on
 * confirm — skipping clocks out with no plan, cancelling stays clocked in.
 */

import React, { useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TaskPriority } from "../../types/logbook";
import { formatWorkDate, workDateOffset } from "../../lib/dates";

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

export interface TaskDraft {
  title: string;
  priority: TaskPriority;
}

interface PlanTomorrowModalProps {
  visible: boolean;
  onCancel: () => void;
  /** Persists the drafts (possibly empty) and clocks out. */
  onConfirm: (drafts: TaskDraft[]) => Promise<void>;
}

export default function PlanTomorrowModal({
  visible,
  onCancel,
  onConfirm,
}: PlanTomorrowModalProps) {
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDrafts([]);
    setTitle("");
    setPriority("medium");
  };

  const addDraft = () => {
    if (!title.trim()) return;
    setDrafts((prev) => [...prev, { title: title.trim(), priority }]);
    setTitle("");
    setPriority("medium");
  };

  const confirm = async (toSave: TaskDraft[]) => {
    setSaving(true);
    try {
      await onConfirm(toSave);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (saving) return;
    reset();
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
            Plan for tomorrow
          </Text>
          <Text className="text-gray-500 text-sm mb-4">
            Before you clock out, jot down your plan of action for{" "}
            {formatWorkDate(workDateOffset(1))}. It will show up in your tasks
            tomorrow.
          </Text>

          <TextInput
            className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
            value={title}
            onChangeText={setTitle}
            placeholder="What's first tomorrow?"
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={addDraft}
          />
          <View className="flex-row gap-2 mb-3">
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                className={`flex-1 rounded-lg py-2 border ${
                  priority === p
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-300"
                }`}
                onPress={() => setPriority(p)}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    priority === p ? "text-white" : "text-gray-600"
                  }`}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            className={`rounded-lg py-2 mb-4 border ${
              title.trim()
                ? "border-blue-600 active:bg-blue-50"
                : "border-gray-200"
            }`}
            onPress={addDraft}
            disabled={!title.trim()}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                title.trim() ? "text-blue-600" : "text-gray-400"
              }`}
            >
              + Add to plan
            </Text>
          </TouchableOpacity>

          {drafts.length > 0 && (
            <View className="mb-4">
              {drafts.map((draft, index) => (
                <View
                  key={`${draft.title}-${index}`}
                  className="flex-row items-center border border-gray-200 rounded-lg px-3 py-2 mb-2"
                >
                  <Text className="flex-1 text-gray-900" numberOfLines={1}>
                    {draft.title}
                  </Text>
                  <Text className="text-xs text-gray-400 uppercase mr-2">
                    {draft.priority}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setDrafts((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Text className="text-gray-300 text-lg">×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            className={`rounded-lg py-3 mb-2 ${
              saving ? "bg-gray-300" : "bg-red-600 active:bg-red-700"
            }`}
            onPress={() => confirm(drafts)}
            disabled={saving}
          >
            <Text
              className={`text-center font-semibold ${
                saving ? "text-gray-500" : "text-white"
              }`}
            >
              {saving
                ? "Clocking out..."
                : drafts.length > 0
                ? "Clock Out & Save Plan"
                : "Clock Out"}
            </Text>
          </TouchableOpacity>
          {drafts.length > 0 && (
            <TouchableOpacity
              className="rounded-lg py-3 mb-2 bg-gray-100 active:bg-gray-200"
              onPress={() => confirm([])}
              disabled={saving}
            >
              <Text className="text-center font-semibold text-gray-700">
                Skip — clock out without a plan
              </Text>
            </TouchableOpacity>
          )}
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
