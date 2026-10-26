import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";

/** Server client acting as the signed-in user (RLS applies). Use this by default. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicEnv();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. Safe to ignore.
        }
      },
    },
  });
}
