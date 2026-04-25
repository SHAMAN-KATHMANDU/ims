"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Bug,
  KeyRound,
  ArrowLeftFromLine,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useAuth } from "@/features/auth";

/**
 * Lean platform-admin shell. Deliberately separate from `DashboardLayout` so
 * platform admins don't pull every tenant-scoped hook (sidebar permission
 * fetch, deals/products/CRM data prefetches, notifications socket, media
 * library sheet, command palette). Loads only the platform nav + topbar.
 *
 * Mirrors the `(editor)` shell pattern: minimal chrome, no DashboardLayout.
 */

const NAV: Array<{ href: string; label: string; icon: typeof ShieldCheck }> = [
  { href: "/platform/tenants", label: "Tenants", icon: ShieldCheck },
  {
    href: "/platform/plan-limits",
    label: "Plan limits",
    icon: SlidersHorizontal,
  },
  {
    href: "/platform/password-resets",
    label: "Password resets",
    icon: KeyRound,
  },
  { href: "/platform/trash", label: "Trash", icon: Trash2 },
  { href: "/platform/error-reports", label: "Error reports", icon: Bug },
];

export function PlatformShell({ children }: { children: ReactNode }) {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "admin";
  const pathname = usePathname() ?? "";
  const { user, logout, isLoggingOut } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  useScrollRestoration(mainRef, "platform-content", { pathname });

  useEffect(() => {
    document.title = "Platform Admin · IMS";
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // useAuth surfaces the error; nothing else to do here.
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold">Platform Admin</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const fullHref = `/${workspace}${href}`;
            const isActive = pathname.startsWith(fullHref);
            return (
              <Link
                key={href}
                href={fullHref}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="text-sm text-muted-foreground">
            Cross-tenant operations console
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${workspace}`}>
                <ArrowLeftFromLine
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Exit to tenant
              </Link>
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {user?.username ?? "Admin"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Platform admin
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main ref={mainRef} className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
