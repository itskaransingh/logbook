import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useColorScheme } from "@/src/components/useColorScheme";
import { SessionProvider, useSession } from "../../context/SessionProvider";

import "../../global.css";

export {
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { loading: sessionLoading } = useSession();
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionLoading]);

  if (!loaded || sessionLoading) {
    return null;
  }

  return null;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <RootLayoutNav />
    </SessionProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isPlatformUser, currentOrg } = useSession();

  // Platform User who hasn't selected an org yet → org picker
  const needsOrgPicker = session && isPlatformUser && !currentOrg;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Org picker + create org — shown to Platform Users before org selection */}
        <Stack.Protected guard={!!needsOrgPicker}>
          <Stack.Screen name="org-picker" options={{ headerShown: false }} />
          <Stack.Screen name="create-org" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Main app — shown when session exists and (Org Member or org selected) */}
        <Stack.Protected guard={!!session && !needsOrgPicker}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Auth — shown when no session */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
