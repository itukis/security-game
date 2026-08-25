import type { User } from "@supabase/supabase-js";

export function hasChosenDisplayName(user: User | null | undefined) {
  const value = user?.user_metadata?.display_name;
  return typeof value === "string" && value.trim().length >= 2;
}
