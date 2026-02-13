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
import { Moon, Sun, LogOut, Menu, Settings, Bug, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ReportErrorDialog } from "./ReportErrorDialog";
import { useIsMobile } from "@/hooks/useMobile";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/useNotifications";

function NotificationsBell({ basePath }: { basePath: string }) {
  const { data: countData } = useUnreadNotificationCount();
  const { data: notifData } = useNotifications({ limit: 5, unreadOnly: false });
  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 md:h-10 md:w-10"
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="font-semibold">Notifications</span>
          <Link href={`${basePath}/crm/notifications`}>
            <Button variant="ghost" size="sm" className="h-auto py-1 text-xs">
              View all
            </Button>
          </Link>
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link
                href={`${basePath}/crm/notifications`}
                className={`flex flex-col items-start p-2 ${!n.readAt ? "bg-muted/50" : ""}`}
              >
                <span className="font-medium text-sm">{n.title}</span>
                {n.message && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </span>
                )}
                <span className="text-xs text-muted-foreground mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout, isLoggingOut } = useAuth();
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
        <NotificationsBell basePath={basePath} />
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
            <DropdownMenuLabel>
              {username ? `@${username}` : "My Account"}
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
