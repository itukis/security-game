import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// In mock mode (NEXT_PUBLIC_USE_MOCK=true) the client is never called.
// Guard here so a missing .env.local doesn't crash module evaluation.
export const supabase =
  url && key
    ? createClient(url, key)
    : (null as unknown as ReturnType<typeof createClient>);
