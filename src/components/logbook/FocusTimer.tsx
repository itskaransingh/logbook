/**
 * Client-side focus (Pomodoro) timer. Nothing is persisted — the end time
 * is anchored to Date.now() + duration so a throttled interval can't drift.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Task } from "../../types/logbook";

const PRESETS = [
  { label: "25 min", minutes: 25 },
  { label: "50 min", minutes: 50 },
  { label: "5 min break", minutes: 5 },
];

interface FocusTimerProps {
  tasks: Task[];
}

export default function FocusTimer({ tasks }: FocusTimerProps) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => {
      const left = Math.round((endsAt - Date.now()) / 1000);
      if (left <= 0) {
        setEndsAt(null);
        setRemaining(0);
        setDone(true);
      } else {
        setRemaining(left);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = (minutes: number) => {
    setDone(false);
    setEndsAt(Date.now() + minutes * 60 * 1000);
  };

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks]
  );
  const focusTask = openTasks.find((t) => t.id === focusTaskId) ?? null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
      <Text className="text-xl font-semibold text-gray-900 mb-4">
        Focus Timer
      </Text>

      {endsAt != null ? (
        <View className="items-center">
          <Text className="text-5xl font-bold text-blue-600 mb-2">
            {mm}:{ss}
          </Text>
          {focusTask && (
            <Text className="text-gray-600 mb-4" numberOfLines={1}>
              Focusing on: {focusTask.title}
            </Text>
          )}
          <TouchableOpacity
            className="bg-gray-100 border border-gray-300 rounded-lg py-3 px-8 active:bg-gray-200"
            onPress={() => {
              setEndsAt(null);
              setRemaining(0);
            }}
          >
            <Text className="text-gray-800 font-medium">Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {done && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <Text className="text-green-700 text-center font-medium">
                Time's up — nice focus session! 🎉
              </Text>
            </View>
          )}
          <View className="flex-row gap-3 mb-4">
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.label}
                className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-3 active:bg-blue-100"
                onPress={() => start(p.minutes)}
              >
                <Text className="text-blue-700 text-center font-medium">
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {openTasks.length > 0 && (
            <View>
              <Text className="text-sm font-medium text-gray-600 mb-2">
                Focus on a task (optional)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {openTasks.slice(0, 6).map((t) => {
                  const selected = focusTaskId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      className={`rounded-full px-3 py-1.5 border ${
                        selected
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-300"
                      }`}
                      onPress={() => setFocusTaskId(selected ? null : t.id)}
                    >
                      <Text
                        className={`text-sm ${
                          selected ? "text-white" : "text-gray-700"
                        }`}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
