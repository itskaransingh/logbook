import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const COLORS = [
  "#4f46e5", "#f59e0b", "#10b981",
  "#ef4444", "#8b5cf6", "#ec4899",
  "#0ea5e9", "#f97316",
];

const { width: W, height: H } = Dimensions.get("window");

interface ParticleData {
  id: number;
  startX: number;
  endX: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
  pw: number;
  ph: number;
}

function Particle({ startX, endX, delay, duration, rotation, color, pw, ph }: ParticleData) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.in(Easing.quad) })
    );
  }, []);

  // Capture statics so they are serialisable into the worklet
  const sx = startX, ex = endX, rot = rotation, c = color, pW = pw, pH = ph;

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = p > 0.75 ? Math.max(0, 1 - (p - 0.75) / 0.25) : 1;
    return {
      position: "absolute" as const,
      left: sx + (ex - sx) * p,
      top: -32 + (H + 64) * p,
      opacity,
      width: pW,
      height: pH,
      borderRadius: 2,
      backgroundColor: c,
      transform: [{ rotate: `${rot * p}deg` }],
    };
  });

  return <Animated.View style={animStyle} />;
}

interface ConfettiRewardProps {
  visible: boolean;
  /** 'mini' = 28 particles from top-center; 'full' = 60 particles full-width */
  size?: "mini" | "full";
  onDone?: () => void;
}

export function ConfettiReward({ visible, size = "mini", onDone }: ConfettiRewardProps) {
  const count = size === "full" ? 60 : 28;

  const particles = useMemo<ParticleData[]>(() => {
    if (!visible) return [];
    return Array.from({ length: count }, (_, i) => {
      const sx =
        size === "full"
          ? Math.random() * W
          : W * 0.2 + Math.random() * W * 0.6;
      const delay = Math.random() * (size === "full" ? 700 : 350);
      const duration = 1600 + Math.random() * 1200;
      const pw = size === "full" ? 7 + Math.random() * 9 : 5 + Math.random() * 6;
      return {
        id: i,
        startX: sx,
        endX: sx + (Math.random() - 0.5) * (size === "full" ? 220 : 110),
        delay,
        duration,
        rotation: Math.random() * 720 - 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pw,
        ph: pw * (0.35 + Math.random() * 0.45),
      };
    });
    // Re-generate on each trigger (visible flip)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || particles.length === 0) return;
    const maxMs = Math.max(...particles.map((p) => p.delay + p.duration)) + 150;
    const t = setTimeout(() => onDone?.(), maxMs);
    return () => clearTimeout(t);
  }, [visible, particles, onDone]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </View>
  );
}
