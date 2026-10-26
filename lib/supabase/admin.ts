import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
/** Elevated client bypasses RLS. Never use for routine student/lecturer requests. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Missing server-side Supabase admin configuration.");
  return createSupabaseClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
