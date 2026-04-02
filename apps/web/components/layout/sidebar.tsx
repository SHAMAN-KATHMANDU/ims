"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWorkspaceRoot } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronDown, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  useAuthStore,
  selectUserRole,
  selectTenant,
  selectToken,
} from "@/store/auth-store";
import {
  useSidebarStore,
  selectSidebarWidth,
  selectSetSidebarWidth,
} from "@/store/sidebar-store";
import { usePlanFeatures } from "@/features/flags";
import { parseFeatureFlagsEnv } from "@repo/shared";
import { getAppEnv, featureFlagsEnv } from "@/config/env";
import { Badge } from "../ui/badge";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
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
import {
  dashboardNavSections,
  filterDashboardNavSections,
  type NavItemWithHref,
} from "@/constants/dashboard-nav";

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
  const token = useAuthStore(selectToken);
  const refreshTenant = useAuthStore((s) => s.refreshTenant);
  const isMobile = useIsMobile();
  const sidebarWidth = useSidebarStore(selectSidebarWidth);
  const setSidebarWidth = useSidebarStore(selectSetSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Refresh tenant (plan, etc.) on mount and token change only.
  // Avoid refreshing on every pathname change to reduce /auth/me load and latency.
  useEffect(() => {
    if (token) refreshTenant();
  }, [token, refreshTenant]);

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
  const appEnv = getAppEnv();
  const enabledEnvFlagsSet = useMemo(
    () => parseFeatureFlagsEnv(featureFlagsEnv),
    [],
  );

  const filteredSections = useMemo(
    () =>
      filterDashboardNavSections(dashboardNavSections, {
        userRole,
        basePath: detectedBasePath,
        planFeatures,
        appEnv,
        enabledEnvFlagsSet,
      }),
    [userRole, detectedBasePath, planFeatures, appEnv, enabledEnvFlagsSet],
  );

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

  const navRef = useRef<HTMLElement>(null);
  useScrollRestoration(navRef, "sidebar-nav");

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
        ref={navRef}
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
          allowDismiss
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
