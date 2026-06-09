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
  signIn: (email: string, password: string) => AuthCallResult;
  signUp: (email: string, password: string) => AuthCallResult;
  signOut: () => SignOutResult;
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

  const signIn = useCallback((email: string, password: string) => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured");
      return Promise.resolve({
        data: null,
        error: new Error("Supabase not configured"),
      });
    }

    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback((email: string, password: string) => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured");
      return Promise.resolve({
        data: null,
        error: new Error("Supabase not configured"),
      });
    }

    return supabase.auth.signUp({ email, password });
  }, []);

  const signOut = useCallback(() => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured");
      return Promise.resolve({ error: null });
    }

    return supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, signIn, signUp, signOut }),
    [user, session, loading, signIn, signUp, signOut]
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
