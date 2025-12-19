import { createClient } from "./server";

/**
 * Get the current user's ID from Supabase server-side.
 * Returns null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Get the current user from Supabase server-side.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

