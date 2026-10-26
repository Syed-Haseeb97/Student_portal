import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicEnv();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
        try { for (const { name, value, options } of items) cookieStore.set(name, value, options); }
        catch { /* Server Components cannot write cookies; refresh in a Route Handler or Server Action. */ }
      },
    },
  });
}
