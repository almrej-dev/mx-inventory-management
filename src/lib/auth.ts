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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, userRole: "viewer" as AppRole, userName: "" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userRole: AppRole = "viewer";
  if (session) {
    const jwt = jwtDecode<JwtPayload>(session.access_token);
    userRole = jwt.user_role || "viewer";
  }

  let userName = "";
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });
    userName = profile?.fullName || "";
  } catch {
    // Profile may not exist yet
  }

  return { user, userRole, userName };
});

const roleHierarchy: Record<AppRole, number> = {
  viewer: 1,
  staff: 2,
  admin: 3,
};

export async function requireRole(minimumRole: AppRole) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Not authenticated");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized: No session");

  const jwt = jwtDecode<JwtPayload>(session.access_token);
  const userRole = jwt.user_role || "viewer";

  if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
    throw new Error(`Unauthorized: Requires ${minimumRole} role`);
  }

  return { user, role: userRole };
}
