import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./config";

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** Public client — respects RLS. Safe for reading survey definitions. */
export function getSupabaseAnon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      requireEnv("PUBLIC_SUPABASE_URL"),
      requireEnv("PUBLIC_SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return anonClient;
}

/**
 * Service-role client — bypasses RLS.
 * Use only on the server for inserts and aggregate reads of answers.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv("PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return adminClient;
}
