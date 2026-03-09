import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";
import type { AppRole } from "@/types";

interface JwtPayload {
  user_role: AppRole;
}

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
