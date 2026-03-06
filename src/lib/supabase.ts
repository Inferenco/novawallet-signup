import { createClient } from "@supabase/supabase-js";
import { appEnv } from "@/config/env";

if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Chat and uploads will be unavailable.");
}

export const supabase =
  appEnv.supabaseUrl && appEnv.supabaseAnonKey
    ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      })
    : null;

export interface ChatMessage {
  id: string;
  table_id: string;
  wallet_address: string | null;
  handle: string;
  body: string;
  created_at: string;
}
