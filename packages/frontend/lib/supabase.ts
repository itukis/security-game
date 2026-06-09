import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

// In mock mode (NEXT_PUBLIC_USE_MOCK=true) the client is never called.
// Guard here so a missing .env.local doesn't crash module evaluation.
export const supabase =
  isSupabaseConfigured
    ? createClient(url!, key!)
    : (null as unknown as ReturnType<typeof createClient>);
