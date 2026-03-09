"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/schemas/user";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createUser(rawData: unknown) {
  await requireRole("admin");

  const parsed = userSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const { email, password, fullName, role } = parsed.data;
  const supabase = createServiceRoleClient();
  let userId: string | null = null;

  try {
    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return { error: authError.message };
    }

    userId = authData.user.id;

    // 2. Insert user_roles record via Supabase (not Prisma -- table managed by SQL)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleError) {
      // Clean up: delete the auth user since role assignment failed
      await supabase.auth.admin.deleteUser(userId);
      return { error: `Failed to assign role: ${roleError.message}` };
    }

    // 3. Create Profile record via Prisma
    await prisma.profile.create({
      data: {
        id: userId,
        fullName,
      },
    });

    return { success: true };
  } catch (err) {
    // Clean up on partial failure
    if (userId) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
    }
    return {
      error: err instanceof Error ? err.message : "Failed to create user",
    };
  }
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export async function listUsers(): Promise<{
  users?: UserListItem[];
  error?: string;
}> {
  await requireRole("admin");

  try {
    const supabase = createServiceRoleClient();

    // Get all auth users
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError) {
      return { error: authError.message };
    }

    // Get all user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      return { error: rolesError.message };
    }

    // Get all profiles
    const profiles = await prisma.profile.findMany();

    // Build role map
    const roleMap = new Map<string, string>();
    for (const r of roles || []) {
      roleMap.set(r.user_id, r.role);
    }

    // Build profile map
    const profileMap = new Map<string, string>();
    for (const p of profiles) {
      profileMap.set(p.id, p.fullName);
    }

    const users: UserListItem[] = authUsers.map((u) => ({
      id: u.id,
      email: u.email || "",
      fullName: profileMap.get(u.id) || "",
      role: roleMap.get(u.id) || "viewer",
      createdAt: u.created_at,
    }));

    return { users };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to list users",
    };
  }
}

export async function deleteUser(
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireRole("admin");

  try {
    const supabase = createServiceRoleClient();

    // Delete auth user (cascading delete handles user_roles)
    const { error: authError } =
      await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      return { error: authError.message };
    }

    // Delete profile via Prisma
    await prisma.profile.delete({ where: { id: userId } }).catch(() => {
      // Profile may not exist, that's okay
    });

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete user",
    };
  }
}
