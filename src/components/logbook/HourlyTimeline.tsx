/**
 * Hour-by-hour timeline of the workday. Each block shows the logged update
 * or an inline editor. Read-only mode is used by the admin detail view.
 * The database enforces same-day-only edits and flags edited rows.
 */

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { HourlyUpdate } from "../../types/logbook";
import { formatHour } from "../../lib/dates";

interface HourlyTimelineProps {
  updates: HourlyUpdate[];
  /** Hours to display, e.g. clock-in hour through current hour. */
  hours: number[];
  /** Omit to render read-only (admin view). */
  onSave?: (hour: number, content: string) => Promise<string | null>;
}

export default function HourlyTimeline({
  updates,
  hours,
  onSave,
}: HourlyTimelineProps) {
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byHour = new Map(updates.map((u) => [u.hour, u]));

  const startEdit = (hour: number) => {
    setEditingHour(hour);
    setDraft(byHour.get(hour)?.content ?? "");
    setError(null);
  };

  const save = async () => {
    if (editingHour == null || !onSave) return;
    if (!draft.trim()) {
      setError("Write a short note about what you did this hour");
      return;
    }
    setSaving(true);
    const err = await onSave(editingHour, draft);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setEditingHour(null);
      setDraft("");
    }
  };

  if (hours.length === 0) {
    return (
      <Text className="text-gray-500 text-center py-4">
        Clock in to start logging hourly updates
      </Text>
    );
  }

  return (
    <View>
      {hours.map((hour) => {
        const update = byHour.get(hour);
        const editing = editingHour === hour;
        return (
          <View key={hour} className="flex-row mb-3">
            <View className="w-16 pt-2">
              <Text className="text-sm font-medium text-gray-500">
                {formatHour(hour)}
              </Text>
            </View>
            <View className="flex-1">
              {editing ? (
                <View className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <TextInput
                    className="bg-white border border-gray-200 rounded-lg p-3 text-gray-900 mb-2"
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What did you work on this hour?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    autoFocus
                  />
                  {error && (
                    <Text className="text-red-600 text-sm mb-2">{error}</Text>
                  )}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-indigo-600 rounded-lg py-2 px-4 active:bg-indigo-700"
                      onPress={save}
                      disabled={saving}
                    >
                      <Text className="text-white font-medium">
                        {saving ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-gray-100 border border-gray-300 rounded-lg py-2 px-4"
                      onPress={() => setEditingHour(null)}
                    >
                      <Text className="text-gray-700">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : update ? (
                <TouchableOpacity
                  className="bg-white border border-gray-200 rounded-lg p-3"
                  onPress={onSave ? () => startEdit(hour) : undefined}
                  disabled={!onSave}
                >
                  <Text className="text-gray-800">{update.content}</Text>
                  {update.is_edited && (
                    <Text className="text-xs text-gray-400 mt-1">edited</Text>
                  )}
                </TouchableOpacity>
              ) : onSave ? (
                <TouchableOpacity
                  className="border border-dashed border-gray-300 rounded-lg p-3 active:bg-gray-50"
                  onPress={() => startEdit(hour)}
                >
                  <Text className="text-gray-400">+ Add update</Text>
                </TouchableOpacity>
              ) : (
                <View className="border border-dashed border-gray-200 rounded-lg p-3">
                  <Text className="text-gray-300">No update logged</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
