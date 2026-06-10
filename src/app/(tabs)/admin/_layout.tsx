/**
 * Admin section layout. Non-admins are redirected home; the data itself
 * is additionally protected by RLS, so this is purely a UX guard.
 */

import React from "react";
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/context/SessionProvider";

export default function AdminLayout() {
  const { isAdmin, loading } = useSession();

  if (!loading && !isAdmin) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Team" }} />
      <Stack.Screen name="[id]" options={{ title: "Employee" }} />
      <Stack.Screen name="new-user" options={{ title: "New Employee" }} />
    </Stack>
  );
}
