import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Server-side Supabase client (App Router). Reads the auth session from
// cookies so RLS runs as the signed-in user. Returns null in demo mode.
export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: CookieToSet[]) => {
        try {
          all.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component — safe to ignore; middleware refreshes.
        }
      },
    },
  });
}
