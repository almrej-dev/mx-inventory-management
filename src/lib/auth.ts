import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";

/**
 * Cached auth helper — deduplicates getUser/profile/role calls
 * within a single server request (layout + page share the same result).
 */
export const getAuth = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, userRole: "viewer" as AppRole, userName: "" };
  }

  const [roleRecord, profile] = await Promise.all([
    prisma.userRole
      .findFirst({ where: { userId: user.id } })
      .catch(() => null),
    prisma.profile
      .findUnique({ where: { id: user.id } })
      .catch(() => null),
  ]);

  const userRole: AppRole = roleRecord?.role ?? "viewer";

  return { user, userRole, userName: profile?.fullName || "" };
});

const roleHierarchy: Record<AppRole, number> = {
  viewer: 1,
  staff: 2,
  admin: 3,
};

export async function requireRole(minimumRole: AppRole) {
  const { user, userRole } = await getAuth();

  if (!user) {
    throw new Error("Unauthorized: Not authenticated");
  }

  if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
    throw new Error(`Unauthorized: Requires ${minimumRole} role`);
  }

  return { user, role: userRole };
}
