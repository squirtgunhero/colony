import { createClient } from "./server";

/**
 * Get the current authenticated user from the server
 * Throws an error if not authenticated
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Get the current authenticated user from the server
 * Returns null if not authenticated (doesn't throw)
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Get the current user's ID
 * Throws an error if not authenticated
 */
export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}

/**
 * Get the current user's profile from the profiles table
 */
export async function getUserProfile() {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: {
  full_name?: string;
  avatar_url?: string;
}) {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
