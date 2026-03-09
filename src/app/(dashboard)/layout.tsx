import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";

interface JwtPayload {
  user_role?: AppRole;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get session for JWT role
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userRole: AppRole = "viewer";
  if (session) {
    const jwt = jwtDecode<JwtPayload>(session.access_token);
    userRole = jwt.user_role || "viewer";
  }

  // Get user profile for display name
  let userName = "";
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });
    userName = profile?.fullName || "";
  } catch {
    // Profile may not exist yet
  }

  return (
    <div className="flex h-screen">
      <Sidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email || ""}
          userName={userName}
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
