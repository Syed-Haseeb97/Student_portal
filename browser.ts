import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

/** Browser client. Uses the publishable key only; RLS is the security boundary. */
export function createClient() {
  const { url, publishableKey } = getPublicEnv();
  return createBrowserClient(url, publishableKey);
}
