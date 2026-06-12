/**
 * Inline create-task form: title, optional description, priority picker,
 * optional estimated time, and (when enabled) a Today/Tomorrow toggle
 * for planning ahead. Used by the employee Tasks screen and the admin
 * "Assign task" flow.
 */

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { TaskPriority } from "../../types/logbook";
import { workDateOffset } from "../../lib/dates";

const PRIORITIES: TaskPriority[] = ["high", "medium", "low"];
const PLAN_DAYS = ["today", "tomorrow"] as const;
type PlanDay = (typeof PLAN_DAYS)[number];

const TIME_PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
];

interface TaskFormProps {
  submitLabel?: string;
  /** Show the Today/Tomorrow toggle (defaults to today-only). */
  showPlanDate?: boolean;
  onSubmit: (input: {
    title: string;
    description?: string;
    priority: TaskPriority;
    plannedFor?: string;
    estimatedMinutes?: number;
  }) => Promise<string | null>;
}

export default function TaskForm({
  submitLabel = "Add Task",
  showPlanDate = false,
  onSubmit,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [planDay, setPlanDay] = useState<PlanDay>("today");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSubmit({
      title,
      description,
      priority,
      plannedFor: planDay === "tomorrow" ? workDateOffset(1) : undefined,
      estimatedMinutes: estimatedMinutes ?? undefined,
    });
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setPlanDay("today");
      setEstimatedMinutes(null);
      setCustomMinutes("");
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

      {/* Estimated time */}
      <Text className="text-sm font-medium text-gray-600 mb-1.5">
        Estimated time (optional)
      </Text>
      <View className="flex-row gap-1.5 mb-2">
        {TIME_PRESETS.map((tp) => (
          <TouchableOpacity
            key={tp.label}
            className={`flex-1 rounded-lg py-1.5 border ${
              estimatedMinutes === tp.minutes
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-gray-300"
            }`}
            onPress={() => {
              setEstimatedMinutes(
                estimatedMinutes === tp.minutes ? null : tp.minutes
              );
              setCustomMinutes("");
            }}
          >
            <Text
              className={`text-center text-xs font-medium ${
                estimatedMinutes === tp.minutes
                  ? "text-white"
                  : "text-gray-600"
              }`}
            >
              {tp.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="flex-row items-center gap-2 mb-3">
        <TextInput
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          value={customMinutes}
          onChangeText={(t) => {
            setCustomMinutes(t);
            const n = parseInt(t, 10);
            setEstimatedMinutes(n > 0 ? n : null);
          }}
          placeholder="Or custom minutes..."
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />
        {estimatedMinutes != null && (
          <TouchableOpacity
            onPress={() => {
              setEstimatedMinutes(null);
              setCustomMinutes("");
            }}
          >
            <Text className="text-gray-400 text-lg">×</Text>
          </TouchableOpacity>
        )}
      </View>

      {showPlanDate && (
        <View className="flex-row gap-2 mb-3">
          {PLAN_DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              className={`flex-1 rounded-lg py-2 border ${
                planDay === day
                  ? "bg-gray-800 border-gray-800"
                  : "bg-white border-gray-300"
              }`}
              onPress={() => setPlanDay(day)}
            >
              <Text
                className={`text-center text-sm font-medium capitalize ${
                  planDay === day ? "text-white" : "text-gray-600"
                }`}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
