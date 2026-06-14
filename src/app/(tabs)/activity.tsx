import { View, Text, FlatList, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useActivityFeed } from "@/src/hooks/useActivityFeed";
import { ActivityFeedEvent } from "@/src/types/logbook";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function FeedCard({ event }: { event: ActivityFeedEvent }) {
  const isWrap = event.type === "day_wrapped";

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl px-4 py-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start gap-3">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center mt-0.5 ${
            isWrap ? "bg-indigo-100" : "bg-green-100"
          }`}
        >
          <FontAwesome
            name={isWrap ? "flag-checkered" : "check"}
            size={14}
            color={isWrap ? "#4f46e5" : "#16a34a"}
          />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 text-sm leading-5">{event.content}</Text>
          <Text className="text-gray-400 text-xs mt-1">{timeAgo(event.created_at)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ActivityFeedScreen() {
  const { events, loading } = useActivityFeed();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <FeedCard event={item} />}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center pt-32 px-8">
          <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mb-4">
            <FontAwesome name="list-alt" size={20} color="#9ca3af" />
          </View>
          <Text className="text-sm font-semibold text-gray-700 mb-1 text-center">
            No activity yet
          </Text>
          <Text className="text-sm text-gray-400 text-center leading-5">
            Completed tasks and day wraps will appear here.
          </Text>
        </View>
      }
    />
  );
}
