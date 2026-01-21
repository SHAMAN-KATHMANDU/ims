"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronDown,
  Warehouse,
  ArrowLeftRight,
  Settings,
  Users,
  Receipt,
  UserCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { useAuthStore, selectUserRole } from "@/stores/auth-store";
import type { UserRole } from "@/utils/auth";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: NavItem[];
  href?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Define nav sections
const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      {
        path: "",
        label: "Dashboard",
        icon: Home,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "SALES",
    items: [
      {
        path: "sales",
        label: "Sales",
        icon: Receipt,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "members",
        label: "Members",
        icon: UserCheck,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "promos",
        label: "Promo Codes",
        icon: Receipt,
        roles: ["admin", "superAdmin"],
      },
    ],
  },
  {
    title: "CATALOG",
    items: [
      {
        path: "product",
        label: "Products",
        icon: Package,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        path: "locations",
        label: "Locations",
        icon: Warehouse,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "transfers",
        label: "Transfers",
        icon: ArrowLeftRight,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        path: "analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: ["admin", "superAdmin"],
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        path: "users",
        label: "Users",
        icon: Users,
        roles: ["superAdmin"],
      },
      {
        path: "admin-controls",
        label: "System",
        icon: Settings,
        roles: ["superAdmin"],
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  basePath?: string;
}

export function Sidebar({ isOpen, onToggle, basePath }: SidebarProps) {
  const pathname = usePathname();
  const userRole = useAuthStore(selectUserRole);
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    MAIN: true,
    SALES: true,
    CATALOG: true,
    INVENTORY: true,
    REPORTS: true,
    SETTINGS: true,
  });

  // Detect base path from current pathname if not provided
  const detectedBasePath = useMemo(() => {
    if (basePath) return basePath;
    if (pathname.startsWith("/admin/dashboard")) {
      return "/admin/dashboard";
    } else if (pathname.startsWith("/dashboard")) {
      return "/dashboard";
    }

    return "/dashboard";
  }, [pathname, basePath]);

  // Build nav items with full paths
  const filteredSections = useMemo(() => {
    if (!userRole) return [];

    return navSections
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => item.roles.includes(userRole))
          .map((item) => ({
            ...item,
            href: `${detectedBasePath}${item.path ? `/${item.path}` : ""}`,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole, detectedBasePath]);

  const toggleSection = (sectionTitle: string) => {
    // Don't toggle sections when sidebar is minimized on desktop
    if (!isMobile && !isOpen) {
      return;
    }
    setOpenSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const isItemActive = (
    item: NavItem & { href?: string },
    detectedBasePath: string,
  ) => {
    const href =
      item.href || `${detectedBasePath}${item.path ? `/${item.path}` : ""}`;

    if (item.path === "") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                S
              </span>
            </div>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto h-8 w-8"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                !isOpen && "rotate-180",
              )}
            />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredSections.map((section) => (
          <Collapsible
            key={section.title}
            open={openSections[section.title] ?? true}
            onOpenChange={() => {
              // Prevent toggling sections when sidebar is minimized on desktop
              if (!isMobile && !isOpen) {
                return;
              }
              toggleSection(section.title);
            }}
          >
            <div className="space-y-2">
              {isOpen ? (
                <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  <span>{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      openSections[section.title] && "rotate-180",
                    )}
                  />
                </CollapsibleTrigger>
              ) : (
                <div className="px-3 py-1.5" />
              )}

              <CollapsibleContent>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const href =
                      item.href ||
                      `${detectedBasePath}${item.path ? `/${item.path}` : ""}`;
                    const active = isItemActive(
                      { ...item, href },
                      detectedBasePath,
                    );
                    const hasChildren =
                      item.children && item.children.length > 0;

                    if (hasChildren && isOpen) {
                      return (
                        <Collapsible
                          key={href}
                          open={openSections[item.label] ?? false}
                          onOpenChange={() => toggleSection(item.label)}
                        >
                          <CollapsibleTrigger
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                              active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">
                              {item.label}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform",
                                openSections[item.label] && "rotate-180",
                              )}
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-4 mt-1 space-y-1">
                            {item.children?.map((child) => {
                              const childHref =
                                child.href ||
                                `${detectedBasePath}${child.path ? `/${child.path}` : ""}`;
                              return (
                                <Link
                                  key={childHref}
                                  href={childHref}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-colors",
                                    isItemActive(
                                      { ...child, href: childHref },
                                      detectedBasePath,
                                    )
                                      ? "text-foreground font-medium"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                  onClick={(e) => {
                                    // Only close sidebar on mobile, never change state on desktop
                                    if (isMobile) {
                                      onToggle();
                                    }
                                    // Stop propagation to prevent Collapsible from responding
                                    e.stopPropagation();
                                  }}
                                >
                                  <span className="h-1 w-1 rounded-full bg-current" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        onClick={(e) => {
                          // Only close sidebar on mobile, never change state on desktop
                          if (isMobile) {
                            onToggle();
                          }
                          // Stop propagation to prevent Collapsible from responding
                          e.stopPropagation();
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {isOpen && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </nav>
    </>
  );

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <aside className="relative flex flex-col h-full border-r border-border bg-background">
            {sidebarContent}
          </aside>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Regular sidebar
  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-background transition-all duration-300",
        isOpen ? "w-64" : "w-20",
      )}
    >
      {sidebarContent}
    </aside>
  );
}
