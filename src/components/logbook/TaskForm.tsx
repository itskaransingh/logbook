/**
 * Inline create-task form: title, optional description, priority picker.
 * Used by the employee Tasks screen and the admin "Assign task" flow.
 */

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { TaskPriority } from "../../types/logbook";

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

interface TaskFormProps {
  submitLabel?: string;
  onSubmit: (input: {
    title: string;
    description?: string;
    priority: TaskPriority;
  }) => Promise<string | null>;
}

export default function TaskForm({
  submitLabel = "Add Task",
  onSubmit,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSubmit({ title, description, priority });
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
    }
  };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <TextInput
        className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        placeholderTextColor="#9CA3AF"
      />
      <TextInput
        className="border border-gray-300 rounded-lg p-3 text-gray-900 mb-3"
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#9CA3AF"
        multiline
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
      {error && <Text className="text-red-600 text-sm mb-3">{error}</Text>}
      <TouchableOpacity
        className={`rounded-lg py-3 ${
          saving || !title.trim() ? "bg-gray-300" : "bg-blue-600 active:bg-blue-700"
        }`}
        onPress={submit}
        disabled={saving || !title.trim()}
      >
        <Text
          className={`text-center font-semibold ${
            saving || !title.trim() ? "text-gray-500" : "text-white"
          }`}
        >
          {saving ? "Saving..." : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
