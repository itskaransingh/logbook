/**
 * @fileoverview Supabase Client Configuration
 * Initializes and configures the Supabase client for the React Native application.
 * Handles authentication storage, session persistence, and URL polyfills.
 *
 * @author Your Name
 * @version 1.0.0
 */

import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/** Supabase project URL from environment variables */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

/** Supabase anonymous key from environment variables */
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Configured Supabase client instance
 * Set up with AsyncStorage for session persistence and proper auth configuration
 *
 * @constant {SupabaseClient} supabase - The configured Supabase client
 *
 * @example
 * // Use for authentication
 * const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 *
 * // Use for database operations
 * const { data, error } = await supabase.from('profiles').select('*');
 *
 * // Use for Edge Functions
 * const { data, error } = await supabase.functions.invoke('openai', { body: { message } });
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage breaks server-side rendering on web (it touches
    // `window` at import time); supabase-js's default storage handles
    // the browser and SSR cases itself.
    ...(Platform.OS !== "web" && { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
