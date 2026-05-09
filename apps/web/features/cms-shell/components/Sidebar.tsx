"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme-store";
import { useCmdKStore } from "@/store/cmdk-store";
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

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: "gauge", href: "/content/dashboard" }],
  },
  {
    label: "Content",
    items: [
      { label: "Pages", icon: "pages", href: "/content/pages", count: 10 },
      { label: "Blog", icon: "blog", href: "/content/blog", count: 7 },
      { label: "Blocks", icon: "blocks", href: "/content/blocks", count: 21 },
      {
        label: "Snippets",
        icon: "snippets",
        href: "/content/snippets",
        count: 6,
      },
      { label: "Media", icon: "media", href: "/content/media", count: 312 },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        label: "Collections",
        icon: "collections",
        href: "/content/collections",
        count: 5,
      },
      { label: "Offers", icon: "offers", href: "/content/offers", count: 5 },
    ],
  },
  {
    label: "Structure",
    items: [
      { label: "Navigation", icon: "navigation", href: "/content/navigation" },
      { label: "Design", icon: "design", href: "/content/design" },
      { label: "Domains", icon: "domains", href: "/content/domains" },
      { label: "SEO & redirects", icon: "seo", href: "/content/seo" },
      { label: "Forms", icon: "forms", href: "/content/forms", count: 3 },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", icon: "settings", href: "/content/settings" }],
  },
];

const STUB_DATA = {
  tenantName: "Lumen & Coal",
  tenantPlan: "pro",
  userInitials: "AP",
  userName: "Alex Park",
  userRole: "Admin",
};

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const openCmdK = useCmdKStore((state) => state.setOpen);

  const buildHref = (href: string) =>
    workspace ? `/${workspace}${href}` : href;

  const isActive = (href: string) => {
    const segment = pathname.split("/content/")?.[1]?.split("/")?.[0];
    const hrefSegment = href.split("/content/")?.[1]?.split("/")?.[0];
    return segment === hrefSegment;
  };

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
            L
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium truncate"
              style={{ color: "var(--ink)" }}
            >
              {STUB_DATA.tenantName}
            </div>
            <div className="text-xs truncate" style={{ color: "var(--ink-3)" }}>
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
                {STUB_DATA.tenantPlan}
              </span>
            </div>
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
        {NAV_GROUPS.map((group) => (
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
                    {item.count && (
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
                        {item.count}
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
            {STUB_DATA.userInitials}
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
              {STUB_DATA.userName}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ink-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {STUB_DATA.userRole}
            </div>
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
