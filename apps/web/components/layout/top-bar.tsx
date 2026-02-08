"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { getWorkspaceRoot } from "@/config/routes";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Moon,
  Sun,
  LogOut,
  Menu,
  Settings,
  Bug,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ReportErrorDialog } from "./ReportErrorDialog";
import { useIsMobile } from "@/hooks/useMobile";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, tenant, logout, isLoggingOut } = useAuth();
  const isMobile = useIsMobile();
  const [reportErrorOpen, setReportErrorOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  // Base path: first segment is workspace (e.g. /admin -> /admin)
  const workspace =
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard")
      ? (pathname.split("/")[1] ?? "admin")
      : pathname.split("/")[1];
  const basePath =
    workspace && !["login", "401", "loading"].includes(workspace)
      ? `/${workspace}`
      : getWorkspaceRoot();
  const settingsPath = `${basePath}/settings`;

  const username = user?.username ?? "";

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border bg-card px-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        {isMobile && onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 md:h-10 md:w-10 transition-colors hover:bg-accent"
        >
          <Sun className="h-4 w-4 md:h-5 md:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 md:h-5 md:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 md:h-10 md:w-10"
            >
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs md:text-sm font-medium text-primary">
                  {username ? username.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="space-y-1">
              <p>{username ? `@${username}` : "My Account"}</p>
              {tenant && (
                <p className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {tenant.name}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={settingsPath} className="flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setReportErrorOpen(true)}
              onSelect={(e) => e.preventDefault()}
            >
              <Bug className="mr-2 h-4 w-4" />
              Report error
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ReportErrorDialog
          open={reportErrorOpen}
          onOpenChange={setReportErrorOpen}
        />
      </div>
    </header>
  );
}
