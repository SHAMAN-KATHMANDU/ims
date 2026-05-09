"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import {
  useThemeStore,
  selectTheme,
  selectThemeToggle,
} from "@/store/theme-store";
import { useCmdKStore, selectCmdKSetOpen } from "@/store/cmdk-store";
import {
  useAuthStore,
  selectUser,
  selectTenant,
  selectUserRole,
  selectUsername,
} from "@/store/auth-store";
import { useSidebarCounts } from "../../tenant-site/hooks/use-sidebar-counts";
import { Icon, type IconName } from "../icons";

interface NavItem {
  label: string;
  icon: IconName;
  href: string;
  count?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const getBaseNavGroups = (): NavGroup[] => [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: "gauge", href: "/content/dashboard" }],
  },
  {
    label: "Content",
    items: [
      { label: "Pages", icon: "pages", href: "/content/pages" },
      { label: "Blog", icon: "blog", href: "/content/blog" },
      { label: "Blocks", icon: "blocks", href: "/content/blocks" },
      {
        label: "Snippets",
        icon: "snippets",
        href: "/content/snippets",
      },
      { label: "Media", icon: "media", href: "/content/media" },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        label: "Collections",
        icon: "collections",
        href: "/content/collections",
      },
      { label: "Offers", icon: "offers", href: "/content/offers" },
    ],
  },
  {
    label: "Structure",
    items: [
      { label: "Templates", icon: "templates", href: "/content/templates" },
      { label: "Design", icon: "design", href: "/content/design" },
      { label: "Domains", icon: "domains", href: "/content/domains" },
      { label: "SEO & redirects", icon: "seo", href: "/content/seo" },
      { label: "Forms", icon: "forms", href: "/content/forms" },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", icon: "settings", href: "/content/settings" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const theme = useThemeStore(selectTheme);
  const toggleTheme = useThemeStore(selectThemeToggle);
  const openCmdK = useCmdKStore(selectCmdKSetOpen);

  const user = useAuthStore(selectUser);
  const tenant = useAuthStore(selectTenant);
  const userRole = useAuthStore(selectUserRole);
  const username = useAuthStore(selectUsername);
  const {
    pages,
    blog,
    blocks,
    snippets,
    media,
    collections,
    offers,
    forms,
    isLoading: countsLoading,
  } = useSidebarCounts();

  const baseGroups = getBaseNavGroups();
  const navGroups: NavGroup[] = baseGroups.map((group) => {
    if (group.label === "Content") {
      return {
        ...group,
        items: group.items.map((item) => {
          const countMap: Record<string, number | undefined> = {
            "/content/pages": pages,
            "/content/blog": blog,
            "/content/blocks": blocks,
            "/content/snippets": snippets,
            "/content/media": media,
          };
          return {
            ...item,
            count: countMap[item.href],
          };
        }),
      };
    }
    if (group.label === "Commerce") {
      return {
        ...group,
        items: group.items.map((item) => {
          const countMap: Record<string, number | undefined> = {
            "/content/collections": collections,
            "/content/offers": offers,
          };
          return {
            ...item,
            count: countMap[item.href],
          };
        }),
      };
    }
    if (group.label === "Structure") {
      return {
        ...group,
        items: group.items.map((item) => {
          const countMap: Record<string, number | undefined> = {
            "/content/forms": forms,
          };
          return {
            ...item,
            count: countMap[item.href],
          };
        }),
      };
    }
    return group;
  });

  const tenantName = tenant?.name ?? "Workspace";
  const tenantPlan = tenant?.plan;
  const userInitials =
    username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  const displayName = username || user?.username || "User";

  const buildHref = (href: string) =>
    workspace ? `/${workspace}${href}` : href;

  const isActive = (href: string) => {
    const segment = pathname.split("/content/")?.[1]?.split("/")?.[0];
    const hrefSegment = href.split("/content/")?.[1]?.split("/")?.[0];
    return segment === hrefSegment;
  };

  const tenantInitial = tenantName.charAt(0).toUpperCase();

  return (
    <div
      className="flex flex-col h-screen overflow-hidden border-r"
      style={{
        width: "var(--side-w)",
        backgroundColor: "var(--bg)",
        borderColor: "var(--line)",
      }}
    >
      {/* Workspace header */}
      <div
        className="border-b p-4 flex-shrink-0"
        style={{
          borderColor: "var(--line)",
        }}
      >
        <div
          className="flex items-center gap-3 mb-4"
          style={{
            padding: "12px",
            backgroundColor: "var(--bg-sunken)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "6px",
              backgroundColor: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-ink)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {tenantInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium truncate"
              style={{ color: "var(--ink)" }}
            >
              {tenantName}
            </div>
            {tenantPlan && (
              <div
                className="text-xs truncate"
                style={{ color: "var(--ink-3)" }}
              >
                <span
                  className="mono"
                  style={{
                    display: "inline-block",
                    padding: "2px 4px",
                    backgroundColor: "var(--bg-active)",
                    borderRadius: "3px",
                    fontSize: "9px",
                  }}
                >
                  {tenantPlan}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={() => openCmdK(true)}
          style={{
            width: "100%",
            height: 32,
            padding: "0 10px",
            backgroundColor: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            color: "var(--ink-3)",
            fontSize: "13px",
          }}
        >
          <Icon name="search" size={14} />
          <span>Search & jump…</span>
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              fontSize: "10px",
              color: "var(--ink-4)",
            }}
          >
            ⌘K
          </span>
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: "16px" }}>
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div
              className="mono text-xs font-semibold uppercase tracking-wider px-4 mb-2"
              style={{
                color: "var(--ink-3)",
                letterSpacing: "0.5px",
                fontSize: "10px",
              }}
            >
              {group.label}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const count =
                  item.count !== undefined
                    ? countsLoading
                      ? undefined
                      : item.count
                    : undefined;
                return (
                  <Link
                    key={item.href}
                    href={buildHref(item.href)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      marginLeft: "4px",
                      marginRight: "4px",
                      borderRadius: "6px",
                      backgroundColor: active
                        ? "var(--bg-active)"
                        : "transparent",
                      color: active ? "var(--ink)" : "var(--ink-2)",
                      fontSize: "13px",
                      textDecoration: "none",
                      transition: "background-color 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <Icon name={item.icon} size={14} />
                    <span className="flex-1">{item.label}</span>
                    {count !== undefined && (
                      <span
                        className="mono text-xs"
                        style={{
                          color: "var(--ink-4)",
                          padding: "2px 6px",
                          backgroundColor: "var(--bg-sunken)",
                          borderRadius: "3px",
                          fontSize: "10px",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="border-t p-4 flex-shrink-0 space-y-3"
        style={{
          borderColor: "var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-ink)",
              fontSize: "12px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </div>
            {userRole && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userRole}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={toggleTheme}
          style={{
            width: "100%",
            height: 32,
            padding: "0 10px",
            backgroundColor: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: "pointer",
            color: "var(--ink-2)",
            fontSize: "13px",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-elev)";
          }}
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          <span>Toggle theme</span>
        </button>
      </div>
    </div>
  );
}
