import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getConfig();
  client ??= createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
