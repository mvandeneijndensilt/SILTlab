import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseEnvironment() {
  return Boolean(getSupabaseEnvironment());
}

export function createSupabaseServerClient(): SupabaseClient | null {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  return createClient(environment.url, environment.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
