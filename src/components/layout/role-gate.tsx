"use client";

import type { AppRole } from "@/types";

interface RoleGateProps {
  allowedRoles: AppRole[];
  userRole: AppRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  allowedRoles,
  userRole,
  children,
  fallback = null,
}: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
