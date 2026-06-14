/**
 * Inline comment thread for a task — expandable via a "comments" badge.
 * Admins see a comment input on all tasks; employees see it on their own.
 */

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { CommentWithAuthor } from "../../hooks/useTaskComments";

interface TaskCommentsProps {
  comments: CommentWithAuthor[];
  onAdd: (content: string) => Promise<string | null>;
  canComment: boolean;
  /** Called when the user taps to expand the comment thread. */
  onExpand?: () => void;
}

export default function TaskComments({
  comments,
  onAdd,
  canComment,
  onExpand,
}: TaskCommentsProps) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!input.trim()) return;
    setSaving(true);
    setError(null);
    const err = await onAdd(input.trim());
    if (err) {
      setError(err);
    } else {
      setInput("");
    }
    setSaving(false);
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 mt-1"
        onPress={() => { setExpanded(true); onExpand?.(); }}
      >
        <Text className="text-xs text-gray-400">
          💬 {comments.length > 0 ? comments.length : "Comment"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase">
          Comments ({comments.length})
        </Text>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text className="text-xs text-gray-400">Close</Text>
        </TouchableOpacity>
      </View>

      {comments.length === 0 && (
        <Text className="text-xs text-gray-400 mb-2">No comments yet</Text>
      )}

      {comments.map((c) => (
        <View key={c.id} className="mb-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-semibold text-gray-700">
              {c.author_name ?? "Unknown"}
            </Text>
            {(c.author_role === "admin" || c.author_role === "super_admin") && (
              <View className={`rounded-full px-1.5 py-0.5 ${c.author_role === "super_admin" ? "bg-purple-100" : "bg-indigo-100"}`}>
                <Text className={`text-[10px] font-medium ${c.author_role === "super_admin" ? "text-purple-700" : "text-indigo-700"}`}>
                  {c.author_role === "super_admin" ? "Co-Founder" : "Admin"}
                </Text>
              </View>
            )}
            <Text className="text-[10px] text-gray-400">
              {new Date(c.created_at).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Text className="text-sm text-gray-800 mt-0.5">{c.content}</Text>
        </View>
      ))}

      {canComment && (
        <View className="flex-row items-center gap-2 mt-1">
          <TextInput
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white"
            value={input}
            onChangeText={setInput}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            maxLength={2000}
            onSubmitEditing={submit}
          />
          <TouchableOpacity
            className={`rounded-lg px-3 py-1.5 ${
              saving || !input.trim()
                ? "bg-gray-200"
                : "bg-indigo-600 active:bg-indigo-700"
            }`}
            onPress={submit}
            disabled={saving || !input.trim()}
          >
            <Text
              className={`text-sm font-medium ${
                saving || !input.trim() ? "text-gray-400" : "text-white"
              }`}
            >
              {saving ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {error && (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      )}
    </View>
  );
}
