/**
 * Work-time awareness notifications.
 *
 * Native (iOS/Android): uses expo-notifications for scheduled local
 * notifications that fire even when the app is backgrounded.
 *
 * Web: falls back to the browser Notification API. Since web notifications
 * only work while the tab is open, we use setInterval to fire them
 * periodically. This is best-effort — the browser may throttle timers
 * in background tabs.
 */

import { useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { formatDuration } from "../lib/time";

// ---------- Native (expo-notifications) ----------

let Notifications: typeof import("expo-notifications") | null = null;

async function loadNotifications() {
  if (Platform.OS === "web") return null;
  try {
    Notifications = await import("expo-notifications");
    return Notifications;
  } catch {
    return null;
  }
}

async function requestNativePermission(): Promise<boolean> {
  const mod = await loadNotifications();
  if (!mod) return false;
  const existing: any = await mod.getPermissionsAsync();
  if (existing.granted) return true;
  const requested: any = await mod.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleNativeNotifications() {
  const mod = await loadNotifications();
  if (!mod) return;

  // Set up handler so notifications show as banners in foreground.
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android channel
  if (Platform.OS === "android") {
    await mod.setNotificationChannelAsync("work-reminders", {
      name: "Work Reminders",
      importance: mod.AndroidImportance.DEFAULT,
    });
  }

  // Repeating every 30 min (1800 s) — iOS minimum for repeating is 60 s.
  await mod.scheduleNotificationAsync({
    content: {
      title: "⏰ You're on the clock",
      body: "Remember to log your hourly update!",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1800,
      repeats: true,
      ...(Platform.OS === "android" && { channelId: "work-reminders" }),
    },
  });
}

async function scheduleBreakEscalation() {
  const mod = await loadNotifications();
  if (!mod) return;

  // 45 min warning
  await mod.scheduleNotificationAsync({
    identifier: "break-warning-45",
    content: {
      title: "⚠️ Long break",
      body: "You've been on break for 45 minutes. Are you still at lunch?",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2700,
      repeats: false,
      ...(Platform.OS === "android" && { channelId: "work-reminders" }),
    },
  });

  // 90 min warning
  await mod.scheduleNotificationAsync({
    identifier: "break-warning-90",
    content: {
      title: "🚨 Break over 1.5 hours",
      body: "Consider clocking out if you're done for the day.",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5400,
      repeats: false,
      ...(Platform.OS === "android" && { channelId: "work-reminders" }),
    },
  });
}

async function cancelAllNative() {
  const mod = await loadNotifications();
  if (!mod) return;
  await mod.cancelAllScheduledNotificationsAsync();
}

// ---------- Web (browser Notification API) ----------

function requestWebPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window))
    return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  return Notification.requestPermission().then((p) => p === "granted");
}

function showWebNotification(title: string, body: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  try {
    new Notification(title, { body, icon: "📒" });
  } catch {
    // Silently fail — some browsers restrict Notification in certain contexts
  }
}

// ---------- Hook ----------

export function useWorkNotifications() {
  const webTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockInTimeRef = useRef<number | null>(null);

  // Cleanup web timers on unmount
  useEffect(() => {
    return () => {
      if (webTimerRef.current) clearInterval(webTimerRef.current);
    };
  }, []);

  const onClockIn = useCallback(async () => {
    clockInTimeRef.current = Date.now();

    if (Platform.OS === "web") {
      const granted = await requestWebPermission();
      if (!granted) return;
      // 30-min interval web notifications
      webTimerRef.current = setInterval(() => {
        const elapsed = clockInTimeRef.current
          ? Math.floor((Date.now() - clockInTimeRef.current) / 1000)
          : 0;
        showWebNotification(
          "⏰ You're on the clock",
          `Working for ${formatDuration(elapsed)}. Remember to log your hourly update!`
        );
      }, 1800000); // 30 min
    } else {
      const granted = await requestNativePermission();
      if (!granted) return;
      await cancelAllNative();
      await scheduleNativeNotifications();
    }
  }, []);

  const onPause = useCallback(async () => {
    if (Platform.OS === "web") {
      if (webTimerRef.current) {
        clearInterval(webTimerRef.current);
        webTimerRef.current = null;
      }
      showWebNotification(
        "☕ Break started",
        "Don't forget to resume when you're back!"
      );
      // Schedule escalation via web timeouts
      webTimerRef.current = setTimeout(() => {
        showWebNotification(
          "⚠️ Long break",
          "You've been on break for 45 minutes."
        );
      }, 2700000) as unknown as ReturnType<typeof setInterval>;
    } else {
      await cancelAllNative();
      await scheduleBreakEscalation();
    }
  }, []);

  const onResume = useCallback(async () => {
    if (Platform.OS === "web") {
      if (webTimerRef.current) {
        clearInterval(webTimerRef.current);
        webTimerRef.current = null;
      }
      webTimerRef.current = setInterval(() => {
        const elapsed = clockInTimeRef.current
          ? Math.floor((Date.now() - clockInTimeRef.current) / 1000)
          : 0;
        showWebNotification(
          "⏰ You're on the clock",
          `Working for ${formatDuration(elapsed)}. Keep it up! 💪`
        );
      }, 1800000);
    } else {
      await cancelAllNative();
      await scheduleNativeNotifications();
    }
  }, []);

  const onClockOut = useCallback(async () => {
    clockInTimeRef.current = null;
    if (Platform.OS === "web") {
      if (webTimerRef.current) {
        clearInterval(webTimerRef.current);
        webTimerRef.current = null;
      }
    } else {
      await cancelAllNative();
    }
  }, []);

  return { onClockIn, onPause, onResume, onClockOut };
}
