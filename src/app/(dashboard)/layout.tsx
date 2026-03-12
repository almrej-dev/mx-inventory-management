import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NavigationAwareMain } from "@/components/layout/navigation-aware-main";
import { getAuth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userRole, userName } = await getAuth();

  if (!user) {
    redirect("/login");
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
        <NavigationAwareMain>{children}</NavigationAwareMain>
      </div>
    </div>
  );
}
