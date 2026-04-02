"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getWorkspaceRoot } from "@/constants/routes";
import {
  dashboardNavSections,
  filterDashboardNavSections,
} from "@/constants/dashboard-nav";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuthStore, selectUserRole, selectUser } from "@/store/auth-store";
import { usePlanFeatures } from "@/features/flags";
import { parseFeatureFlagsEnv } from "@repo/shared";
import { getAppEnv, featureFlagsEnv } from "@/config/env";

const MAX_RECENT = 8;

function recentStorageKey(workspaceSlug: string, userId: string): string {
  return `ims:command-palette-recent:${workspaceSlug}:${userId}`;
}

interface RecentNavEntry {
  label: string;
  href: string;
}

function readRecent(workspaceSlug: string, userId: string): RecentNavEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(
      recentStorageKey(workspaceSlug, userId),
    );
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentNavEntry =>
          x != null &&
          typeof x === "object" &&
          "label" in x &&
          "href" in x &&
          typeof (x as RecentNavEntry).label === "string" &&
          typeof (x as RecentNavEntry).href === "string",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(
  workspaceSlug: string,
  userId: string,
  label: string,
  href: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = recentStorageKey(workspaceSlug, userId);
    const prev = readRecent(workspaceSlug, userId);
    const next = [
      { label, href },
      ...prev.filter((e) => e.href !== href),
    ].slice(0, MAX_RECENT);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [recentTick, setRecentTick] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const userRole = useAuthStore(selectUserRole);
  const user = useAuthStore(selectUser);
  const planFeatures = usePlanFeatures();
  const appEnv = getAppEnv();
  const enabledEnvFlagsSet = useMemo(
    () => parseFeatureFlagsEnv(featureFlagsEnv),
    [],
  );

  const basePath = useMemo(() => {
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
  }, [pathname]);

  const workspaceSlug = useMemo(
    () => basePath.replace(/^\//, "") || "admin",
    [basePath],
  );

  const filteredSections = useMemo(
    () =>
      filterDashboardNavSections(dashboardNavSections, {
        userRole,
        basePath,
        planFeatures,
        appEnv,
        enabledEnvFlagsSet,
      }),
    [userRole, basePath, planFeatures, appEnv, enabledEnvFlagsSet],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setRecentTick((t) => t + 1);
  }, [open]);

  const recentItems = useMemo(() => {
    if (!user?.id) return [];
    void recentTick;
    return readRecent(workspaceSlug, user.id);
  }, [user?.id, workspaceSlug, recentTick]);

  const runNav = useCallback(
    (href: string, label: string) => {
      if (user?.id) {
        writeRecent(workspaceSlug, user.id, label, href);
      }
      setOpen(false);
      router.push(href);
    },
    [router, user?.id, workspaceSlug],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Go to…"
      description="Search workspace navigation and recent pages"
    >
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        {recentItems.length > 0 ? (
          <CommandGroup heading="Recent">
            {recentItems.map((r) => (
              <CommandItem
                key={r.href}
                value={`${r.label} ${r.href} recent`}
                onSelect={() => runNav(r.href, r.label)}
              >
                {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {recentItems.length > 0 ? <CommandSeparator /> : null}
        {filteredSections.map((section) => (
          <CommandGroup key={section.title} heading={section.title}>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.path} ${section.title}`}
                  onSelect={() => runNav(item.href, item.label)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
