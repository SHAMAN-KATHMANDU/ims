"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWorkspaceRoot } from "@/constants/routes";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  ChevronLeft,
  ChevronDown,
  Warehouse,
  ArrowLeftRight,
  UserCog,
  Users,
  Receipt,
  Factory,
  Percent,
  Tags,
  Layers,
  Bug,
  Building2,
  ShieldCheck,
  LayoutDashboard,
  Contact,
  Handshake,
  CheckSquare,
  Bell,
  Trash2,
  FileText,
  Ticket,
  Boxes,
  TrendingUp,
  LineChart,
  DollarSign,
  PieChart,
  SlidersHorizontal,
  Server,
  Truck,
  PackageCheck,
  ListChecks,
} from "lucide-react";
import { Button } from "../ui/button";
import { useAuthStore, selectUserRole, selectTenant } from "@/store/auth-store";
import {
  useSidebarStore,
  selectSidebarWidth,
  selectSetSidebarWidth,
} from "@/store/sidebar-store";
import type { UserRole } from "@/utils/auth";
import { usePlanFeatures } from "@/features/flags";
import { Feature } from "@repo/shared";
import { Badge } from "../ui/badge";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { useIsMobile } from "@/hooks/useMobile";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  /** When set, item is only shown when this plan feature is enabled for the tenant. */
  feature?: Feature;
  children?: NavItem[];
  href?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "PLATFORM",
    items: [
      { path: "", label: "Dashboard", icon: Home, roles: ["platformAdmin"] },
      {
        path: "platform/tenants",
        label: "Tenants",
        icon: ShieldCheck,
        roles: ["platformAdmin"],
      },
      {
        path: "platform/plan-limits",
        label: "Plan limits",
        icon: SlidersHorizontal,
        roles: ["platformAdmin"],
      },
    ],
  },
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
    title: "CRM",
    items: [
      {
        path: "crm",
        label: "Overview",
        icon: LayoutDashboard,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "crm/companies",
        label: "Companies",
        icon: Factory,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "crm/contacts",
        label: "Contacts",
        icon: Contact,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "crm/deals",
        label: "Deals",
        icon: Handshake,
        roles: ["user", "admin", "superAdmin"],
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "crm/tasks",
        label: "Tasks",
        icon: CheckSquare,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "crm/notifications",
        label: "Notifications",
        icon: Bell,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "crm/settings",
        label: "CRM Settings",
        icon: SlidersHorizontal,
        roles: ["admin", "superAdmin"],
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
        path: "sales/user-report",
        label: "User Sales Report",
        icon: ListChecks,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "PRODUCTS",
    items: [
      {
        path: "products/catalog",
        label: "Catalog",
        icon: Package,
        roles: ["user", "admin", "superAdmin"],
      },
      {
        path: "products/promos",
        label: "Promo Codes",
        icon: Ticket,
        roles: ["user", "admin", "superAdmin"],
        feature: Feature.PROMO_MANAGEMENT,
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
        path: "products",
        label: "Products",
        icon: Boxes,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "products/categories",
        label: "Categories",
        icon: Tags,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "products/attribute-types",
        label: "Attribute Types",
        icon: Layers,
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
        icon: Truck,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "transfers",
        label: "Transfers",
        icon: PackageCheck,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "products/discounts",
        label: "Discounts",
        icon: Percent,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "promos",
        label: "Promotions",
        icon: Ticket,
        roles: ["admin", "superAdmin"],
        feature: Feature.PROMO_MANAGEMENT,
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        path: "reports/analytics/sales",
        label: "Sales & Revenue",
        icon: TrendingUp,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/inventory",
        label: "Inventory & Operations",
        icon: Package,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/customers",
        label: "Customers & Promotions",
        icon: Users,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/trends",
        label: "Trends",
        icon: LineChart,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/financial",
        label: "Financial",
        icon: DollarSign,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/crm",
        label: "CRM Reports",
        icon: PieChart,
        roles: ["admin", "superAdmin"],
        feature: Feature.ANALYTICS_ADVANCED,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        path: "trash",
        label: "Trash",
        icon: Trash2,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "settings",
        label: "Settings",
        icon: UserCog,
        roles: ["admin", "superAdmin"],
      },
      {
        path: "users",
        label: "Users",
        icon: Users,
        roles: ["superAdmin"],
      },
      {
        path: "settings/logs",
        label: "User Logs",
        icon: FileText,
        roles: ["superAdmin"],
        feature: Feature.AUDIT_LOGS,
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
        icon: Server,
        roles: ["superAdmin"],
      },
    ],
  },
];

type NavItemWithHref = NavItem & { href: string };

function SidebarItem({
  item,
  basePath,
  pathname,
  isExpanded,
  onItemClick,
}: {
  item: NavItemWithHref;
  basePath: string;
  pathname: string;
  isExpanded: boolean;
  onItemClick: () => void;
}) {
  const Icon = item.icon;
  const active = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;

  const linkContent = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {isExpanded && <span>{item.label}</span>}
    </>
  );

  if (hasChildren && isExpanded) {
    return (
      <Collapsible>
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
          aria-expanded={undefined}
        >
          {linkContent}
          <ChevronDown className="h-4 w-4 shrink-0" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 mt-1 space-y-1">
          {item.children?.map((child) => {
            const childHref =
              child.href ?? `${basePath}${child.path ? `/${child.path}` : ""}`;
            return (
              <Link
                key={childHref}
                href={childHref}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-colors",
                  pathname === childHref
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={(e) => {
                  onItemClick();
                  e.stopPropagation();
                }}
              >
                <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
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
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={onItemClick}
    >
      {linkContent}
    </Link>
  );
}

function SidebarSection({
  section,
  basePath,
  pathname,
  isExpanded,
  openSections,
  onToggleSection,
  onItemClick,
  isCollapsed,
}: {
  section: { title: string; items: NavItemWithHref[] };
  basePath: string;
  pathname: string;
  isExpanded: boolean;
  openSections: Record<string, boolean>;
  onToggleSection: (title: string) => void;
  onItemClick: () => void;
  isCollapsed: boolean;
}) {
  const hasMultipleItems = section.items.length > 1;
  const firstItem = section.items[0];
  const FirstIcon = firstItem?.icon;

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  if (isCollapsed && hasMultipleItems && firstItem && FirstIcon) {
    return (
      <HoverCard openDelay={100} closeDelay={400}>
        <HoverCardTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-label={`${section.title} menu`}
            title={section.title}
            className={cn(
              "flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pathname === firstItem?.href ||
                section.items.some((i) => pathname === i.href)
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <FirstIcon className="h-5 w-5" aria-hidden />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-48 p-0"
        >
          <nav aria-label={`${section.title} submenu`}>
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              {section.title}
            </div>
            <div className="py-1">
              {section.items.map((navItem) => {
                if (!navItem) return null;
                const Icon = navItem.icon;
                const active = pathname === navItem.href;
                return (
                  <Link
                    key={navItem.href}
                    href={navItem.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    onClick={onItemClick}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{navItem.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (isCollapsed && section.items.length === 1) {
    const item = section.items[0];
    if (!item) return null;
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            onClick={onItemClick}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible
      open={openSections[section.title] ?? true}
      onOpenChange={() => onToggleSection(section.title)}
    >
      <div className="space-y-2">
        <CollapsibleTrigger
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={
            (openSections[section.title] ?? true) ? "true" : "false"
          }
          onKeyDown={(e) =>
            handleKeyDown(e, () => onToggleSection(section.title))
          }
        >
          <span>{section.title}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              openSections[section.title] && "rotate-180",
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1">
            {section.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                basePath={basePath}
                pathname={pathname}
                isExpanded={isExpanded}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

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
  const sidebarWidth = useSidebarStore(selectSidebarWidth);
  const setSidebarWidth = useSidebarStore(selectSetSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      setSidebarWidth(startWidth.current + delta);
    };
    const onUp = () => setResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing, setSidebarWidth]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    PLATFORM: true,
    MAIN: true,
    CRM: true,
    SALES: true,
    PRODUCTS: true,
    INVENTORY: true,
    REPORTS: true,
    SETTINGS: true,
  });

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

  const planFeatures = usePlanFeatures();

  const filteredSections = useMemo(() => {
    if (!userRole) return [];
    return navSections
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => item.roles.includes(userRole))
          .filter(
            (item) => !item.feature || planFeatures[item.feature] === true,
          )
          .map((item) => ({
            ...item,
            href: `${detectedBasePath}${item.path ? `/${item.path}` : ""}`,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole, detectedBasePath, planFeatures]);

  const toggleSection = useCallback(
    (sectionTitle: string) => {
      if (!isMobile && !isOpen) return;
      setOpenSections((prev) => ({
        ...prev,
        [sectionTitle]: !prev[sectionTitle],
      }));
    },
    [isMobile, isOpen],
  );

  const handleItemClick = useCallback(() => {
    if (isMobile) onToggle();
  }, [isMobile, onToggle]);

  const handleCollapseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  const sidebarContent = (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-border shrink-0">
        {isOpen ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shrink-0">
              <Building2
                className="h-4 w-4 text-primary-foreground"
                aria-hidden
              />
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
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center mx-auto shrink-0">
                <Building2
                  className="h-4 w-4 text-primary-foreground"
                  aria-hidden
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {tenant?.name ?? "IMS"}
            </TooltipContent>
          </Tooltip>
        )}
        {!isMobile && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="ml-auto h-8 w-8 shrink-0"
                aria-expanded={isOpen ? "true" : "false"}
                aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                onKeyDown={handleCollapseKeyDown}
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    !isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isOpen ? "Collapse sidebar" : "Expand sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6"
        aria-label="Main navigation"
      >
        {filteredSections.map((section) => (
          <SidebarSection
            key={section.title}
            section={section}
            basePath={detectedBasePath}
            pathname={pathname}
            isExpanded={isOpen}
            openSections={openSections}
            onToggleSection={toggleSection}
            onItemClick={handleItemClick}
            isCollapsed={!isOpen}
          />
        ))}
      </nav>
    </TooltipProvider>
  );

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

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-background shrink-0 transition-[width] duration-250 ease-in-out",
        isOpen ? "w-[var(--sidebar-computed-width)]" : "w-[72px]",
      )}
      style={
        isOpen
          ? ({
              "--sidebar-computed-width": `${sidebarWidth}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {sidebarContent}
      {isOpen && (
        <button
          type="button"
          aria-label="Resize sidebar"
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            startX.current = e.clientX;
            startWidth.current = sidebarWidth;
            setResizing(true);
          }}
        />
      )}
    </aside>
  );
}
