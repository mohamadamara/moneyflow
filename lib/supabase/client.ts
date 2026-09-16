"use client";

import { createBrowserClient } from "@supabase/ssr";

// Returns a browser Supabase client, or null when the app is running
// in local demo mode (no env configured). Callers should fall back to
// the local store when this is null.
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
