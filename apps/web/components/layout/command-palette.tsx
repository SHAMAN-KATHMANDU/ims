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
import { useGlobalSearch } from "@/features/global-search";
import { FileText, Newspaper, Package, Sparkles } from "lucide-react";
import {
  useAuthStore,
  selectUserRole,
  selectUser,
  selectTenantWebsiteEnabled,
} from "@/store/auth-store";
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

// Debounce helper for the cross-entity search input. Keeps the cmd-K
// from firing 4 list queries per keystroke.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

const SEARCH_KIND_ICON = {
  page: FileText,
  post: Newspaper,
  product: Package,
  snippet: Sparkles,
} as const;

const SEARCH_KIND_LABEL = {
  page: "Pages",
  post: "Blog posts",
  product: "Products",
  snippet: "Snippets",
} as const;

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [recentTick, setRecentTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
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

  const tenantWebsiteEnabled = useAuthStore(selectTenantWebsiteEnabled);
  const tenantFeatures = useMemo(
    () => ({ websiteEnabled: tenantWebsiteEnabled }),
    [tenantWebsiteEnabled],
  );

  const filteredSections = useMemo(
    () =>
      filterDashboardNavSections(dashboardNavSections, {
        userRole,
        basePath,
        planFeatures,
        appEnv,
        enabledEnvFlagsSet,
        tenantFeatures,
      }),
    [
      userRole,
      basePath,
      planFeatures,
      appEnv,
      enabledEnvFlagsSet,
      tenantFeatures,
    ],
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

  // Cross-entity search — only runs while the palette is open and the
  // user has typed enough characters (the hook itself enforces ≥ 2).
  const search = useGlobalSearch(debouncedQuery, { enabled: open });
  const groupedSearchResults = useMemo(() => {
    const results = search.data ?? [];
    const order: Array<keyof typeof SEARCH_KIND_LABEL> = [
      "page",
      "post",
      "product",
      "snippet",
    ];
    return order
      .map((kind) => ({
        kind,
        items: results.filter((r) => r.kind === kind),
      }))
      .filter((g) => g.items.length > 0);
  }, [search.data]);

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

  // Reset the search box when the palette closes — otherwise a stale
  // query lingers in the next open and surprises the user.
  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const hasSearchResults = groupedSearchResults.length > 0;
  const isSearching = debouncedQuery.trim().length >= 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Go to…"
      description="Search workspace navigation, pages, posts, products, and snippets"
    >
      <CommandInput
        placeholder="Search pages, posts, products, snippets…"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching && search.isLoading ? "Searching…" : "No matches."}
        </CommandEmpty>

        {hasSearchResults &&
          groupedSearchResults.map((group, gi) => {
            const Icon = SEARCH_KIND_ICON[group.kind];
            return (
              <CommandGroup
                key={group.kind}
                heading={SEARCH_KIND_LABEL[group.kind]}
              >
                {group.items.map((r) => {
                  const href = r.href(workspaceSlug);
                  return (
                    <CommandItem
                      key={`${group.kind}:${r.id}`}
                      value={`${r.label} ${r.sub ?? ""} ${group.kind}`}
                      onSelect={() => runNav(href, r.label)}
                    >
                      <Icon className="size-4" />
                      <span className="flex-1 truncate">{r.label}</span>
                      {r.sub && (
                        <span className="text-xs font-mono text-muted-foreground/70 truncate">
                          {r.sub}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
                {gi < groupedSearchResults.length - 1 && <CommandSeparator />}
              </CommandGroup>
            );
          })}

        {hasSearchResults && <CommandSeparator />}

        {!isSearching && recentItems.length > 0 ? (
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
        {!isSearching && recentItems.length > 0 ? <CommandSeparator /> : null}
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
