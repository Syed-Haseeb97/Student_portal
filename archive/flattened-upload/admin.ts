import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: BYPASSES RLS. Server-only (the import above fails the build if
 * this file is pulled into client code). Allowed uses: roster import and first-admin
 * bootstrap, after the caller has been authorized in server code. Never use it to serve
 * student or lecturer requests.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
