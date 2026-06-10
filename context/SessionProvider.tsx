/**
 * @fileoverview Session Context Provider
 * Manages authentication state plus the signed-in user's Logbook profile
 * (including role), so the router and screens can gate on admin/employee.
 */

import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Profile } from "../src/types/logbook";

interface SessionContextType {
  /** Current user session or null if not authenticated */
  session: Session | null;
  /** The signed-in user's profile row (null while signed out) */
  profile: Profile | null;
  /** Convenience flag for role gating */
  isAdmin: boolean;
  /** Loading until both session and profile have resolved */
  loading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
});

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Resolve the profile (role) before clearing loading, so the router
    // never renders with an unknown role.
    const applySession = async (next: Session | null) => {
      if (next?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", next.user.id)
          .single();
        if (cancelled) return;
        setProfile((data as Profile) ?? null);
      } else {
        setProfile(null);
      }
      if (cancelled) return;
      setSession(next);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, profile, isAdmin: profile?.role === "admin", loading }}
    >
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Access session state, the user's profile, and role flags.
 *
 * @example
 * const { session, profile, isAdmin, loading } = useSession();
 */
export const useSession = () => {
  return useContext(SessionContext);
};
