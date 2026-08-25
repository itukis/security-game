"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthCallResult = Promise<{ data: unknown; error: Error | null }>;
type SignOutResult = Promise<{ error: Error | null }>;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  signInWithGoogle: () => AuthCallResult;
  signOut: () => SignOutResult;
  updateDisplayName: (name: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(() => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured");
      return Promise.resolve({
        data: null,
        error: new Error("Supabase not configured"),
      });
    }

    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        scopes: "https://www.googleapis.com/auth/userinfo.email",
      },
    });
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error("Supabase not configured") };
    }
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    return { error };
  }, []);

  const signOut = useCallback(() => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured");
      return Promise.resolve({ error: null });
    }

    return supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      displayName:
        (user?.user_metadata?.display_name as string | undefined) ??
        (user?.user_metadata?.full_name as string | undefined) ??
        (user?.user_metadata?.name as string | undefined) ??
        null,
      signInWithGoogle,
      signOut,
      updateDisplayName,
    }),
    [user, session, loading, signInWithGoogle, signOut, updateDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
