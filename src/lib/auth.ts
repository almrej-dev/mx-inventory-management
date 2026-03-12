import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";

interface JwtPayload {
  user_role: AppRole;
}

/**
 * Cached auth helper — deduplicates getUser/getSession/profile calls
 * within a single server request (layout + page share the same result).
 */
export const getAuth = cache(async () => {
  const supabase = await createClient();

  // getSession reads from cookies — no network call, fast
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userRole: AppRole = "viewer";
  if (session) {
    const jwt = jwtDecode<JwtPayload>(session.access_token);
    userRole = jwt.user_role || "viewer";
  }

  // Use session sub as provisional user ID to parallelize getUser + profile fetch
  const sessionUserId = session
    ? (jwtDecode<{ sub: string }>(session.access_token).sub ?? null)
    : null;

  // Run network validation and DB lookup in parallel
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    sessionUserId
      ? prisma.profile.findUnique({ where: { id: sessionUserId } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!user) {
    return { user: null, userRole: "viewer" as AppRole, userName: "" };
  }

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
