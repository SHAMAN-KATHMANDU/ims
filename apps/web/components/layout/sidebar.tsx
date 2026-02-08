"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWorkspaceRoot } from "@/config/routes";
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
  Factory,
  Percent,
  Tags,
  Bug,
  Building2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  useAuthStore,
  selectUserRole,
  selectTenant,
} from "@/stores/auth-store";
import type { UserRole } from "@/utils/auth";
import { Badge } from "../ui/badge";
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
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "sales/user-report",
        label: "User Sales Report",
        icon: Receipt,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "PRODUCTS",
    items: [
      {
        path: "product/catalog",
        label: "Catalog",
        icon: Package,
        roles: ["user", "admin", "superAdmin"],
      },

      {
        path: "product/discounts",
        label: "Discounts",
        icon: Percent,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "product/promos",
        label: "Promo Codes",
        icon: Percent,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "transfers/new",
        label: "Create Transfer Request",
        icon: ArrowLeftRight,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        path: "product",
        label: "Products",
        icon: Package,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "product/categories",
        label: "Categories",
        icon: Tags,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "locations",
        label: "Locations",
        icon: Warehouse,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "vendors",
        label: "Vendors",
        icon: Factory,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "transfers",
        label: "Transfers",
        icon: ArrowLeftRight,
        roles: ["admin", "superAdmin"],
      },
    ],
  },
  {
    title: "PROMOTIONS",
    items: [
      {
        path: "promos",
        label: "Promo Codes",
        icon: Percent,
        roles: ["admin", "superAdmin"],
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        path: "reports/analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "reports/analytics/sales",
        label: "Sales & Revenue",
        icon: BarChart3,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "reports/analytics/inventory",
        label: "Inventory & Operations",
        icon: BarChart3,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "reports/analytics/customers",
        label: "Customers & Promotions",
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
        path: "settings/logs",
        label: "User Logs",
        icon: BarChart3,
        roles: ["superAdmin"],
      },
      {
        path: "settings/error-reports",
        label: "Error Reports",
        icon: Bug,
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
  const tenant = useAuthStore(selectTenant);
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    MAIN: true,
    SALES: true,
    PRODUCTS: true,
    INVENTORY: true,
    PROMOTIONS: true,
    REPORTS: true,
    SETTINGS: true,
  });

  // Base path: first segment is workspace (e.g. /admin, /admin/sales -> /admin).
  const detectedBasePath = useMemo(() => {
    if (basePath) return basePath;
    const segment = pathname.split("/")[1];
    if (
      segment &&
      segment !== "login" &&
      segment !== "401" &&
      segment !== "loading"
    ) {
      return `/${segment}`;
    }
    return getWorkspaceRoot();
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

  // Only the current page link is active: exact pathname match (no parent paths as active).
  const isItemActive = (
    item: NavItem & { href?: string },
    detectedBasePath: string,
  ) => {
    const href =
      item.href || `${detectedBasePath}${item.path ? `/${item.path}` : ""}`;
    return pathname === href;
  };

  const sidebarContent = (
    <>
      {/* Header with tenant info */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {isOpen ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {tenant?.name ?? "IMS"}
              </p>
              {tenant && (
                <Badge
                  variant={
                    tenant.subscriptionStatus === "ACTIVE"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[10px] h-4 px-1"
                >
                  {tenant.plan}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center mx-auto">
            <Building2 className="h-4 w-4 text-primary-foreground" />
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
        <SheetContent
          side="left"
          className="w-64 p-0"
          aria-describedby={undefined}
        >
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
