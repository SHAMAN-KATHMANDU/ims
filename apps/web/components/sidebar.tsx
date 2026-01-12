"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  BarChart3,
  Settings,
  ChevronLeft,
  Shield,
} from "lucide-react";
import { Button } from "./ui/button";
import { getUserRole, type UserRole } from "@/utils/auth";
import { useMemo } from "react";

interface NavItem {
  path: string; // Relative path (e.g., "", "product", "analytics")
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

// Define nav items with relative paths
const navItemConfigs: NavItem[] = [
  {
    path: "",
    label: "Home",
    icon: Home,
    roles: ["user", "admin", "superAdmin"],
  },
  {
    path: "product",
    label: "Product",
    icon: Package,
    roles: ["user", "admin", "superAdmin"],
  },
  {
    path: "analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin", "superAdmin"],
  },
  {
    path: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["user", "admin", "superAdmin"],
  },
  {
    path: "admin-controls",
    label: "Admin Controls",
    icon: Shield,
    roles: ["superAdmin"],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  basePath?: string; // Optional: can be passed explicitly, otherwise auto-detected
}

export function Sidebar({ isOpen, onToggle, basePath }: SidebarProps) {
  const pathname = usePathname();
  const userRole = getUserRole();

  // Detect base path from current pathname if not provided
  const detectedBasePath = useMemo(() => {
    if (basePath) return basePath;

    // Auto-detect: check if we're in /admin/dashboard or /dashboard
    if (pathname.startsWith("/admin/dashboard")) {
      return "/admin/dashboard";
    } else if (pathname.startsWith("/dashboard")) {
      return "/dashboard";
    }

    // Default fallback
    return "/dashboard";
  }, [pathname, basePath]);

  // Build nav items with full paths based on detected base path
  const navItems = useMemo(() => {
    if (!userRole) return [];

    return navItemConfigs
      .filter((item) => item.roles.includes(userRole))
      .map((item) => ({
        ...item,
        href: `${detectedBasePath}${item.path ? `/${item.path}` : ""}`,
      }));
  }, [userRole, detectedBasePath]);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-sidebar transition-all duration-300",
        isOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {isOpen && (
          <h1 className="text-xl font-bold text-primary">Dashboard</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              !isOpen && "rotate-180",
            )}
          />
        </Button>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          // More precise active check
          const isActive =
            item.path === ""
              ? pathname === item.href // Home: exact match only
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
