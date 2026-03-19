"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { AppRole } from "@/types";

interface HeaderProps {
  userEmail: string;
  userName: string;
  userRole: AppRole;
}

export function Header({ userEmail, userName, userRole }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 items-center border-b px-4 md:px-6">
      <MobileNav userRole={userRole} />
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <Badge variant="outline" className="capitalize">
          {userRole}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
              />
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{userName || "User"}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
