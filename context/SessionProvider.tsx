import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Profile, Organization } from "../src/types/logbook";

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** True when signed in with a personal email (org_id IS NULL on profile) */
  isPlatformUser: boolean;
  /** The org the user is currently operating in. Null until org is selected. */
  currentOrg: Organization | null;
  /** All orgs owned by this Platform User. Empty for Org Members. */
  orgs: Organization[];
  /** Enter one of the Platform User's orgs. */
  selectOrg: (org: Organization) => void;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  profile: null,
  isAdmin: false,
  isSuperAdmin: false,
  isPlatformUser: false,
  currentOrg: null,
  orgs: [],
  selectOrg: () => {},
  loading: true,
});

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = async (next: Session | null) => {
    if (next?.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", next.user.id)
        .single();

      const p = (profileData as Profile) ?? null;
      setProfile(p);

      if (p && p.org_id === null) {
        // Platform User — fetch their owned orgs
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("owner_id", next.user.id)
          .order("created_at");
        setOrgs((orgData as Organization[]) ?? []);
        setCurrentOrg(null);
      } else if (p && p.org_id) {
        // Org Member — fetch their single org
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", p.org_id)
          .single();
        setCurrentOrg((orgData as Organization) ?? null);
        setOrgs([]);
      }
    } else {
      setProfile(null);
      setCurrentOrg(null);
      setOrgs([]);
    }
    setSession(next);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) applySession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) applySession(session);
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isPlatformUser = profile?.org_id === null && profile !== null;
  // Platform User who has entered one of their orgs is the Owner — full super_admin powers
  const isOwner =
    isPlatformUser &&
    !!currentOrg &&
    currentOrg.owner_id === session?.user?.id;

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        isAdmin:
          isOwner ||
          profile?.role === "admin" ||
          profile?.role === "super_admin",
        isSuperAdmin: isOwner || profile?.role === "super_admin",
        isPlatformUser,
        currentOrg,
        orgs,
        selectOrg: setCurrentOrg,
        loading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  return useContext(SessionContext);
};
