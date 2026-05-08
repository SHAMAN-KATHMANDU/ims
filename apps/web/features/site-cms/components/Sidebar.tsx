"use client";

import { usePathname, useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  Home,
  FileText,
  Newspaper,
  Boxes,
  Code,
  Image,
  Layers,
  Tag,
  Menu,
  Palette,
  Globe,
  Search,
  Settings,
  ChevronDown,
  Moon,
} from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { useTheme } from "../hooks/use-theme";
import { useAuthStore, selectTenant, selectUser } from "@/store/auth-store";
import type { JSX } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  count?: number;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: Home }],
  },
  {
    label: "Content",
    items: [
      { id: "pages", label: "Pages", icon: FileText, count: 10 },
      { id: "blog", label: "Blog", icon: Newspaper, count: 7 },
      { id: "blocks", label: "Blocks", icon: Boxes, count: 21 },
      { id: "snippets", label: "Snippets", icon: Code, count: 6 },
      { id: "media", label: "Media", icon: Image, count: 312 },
    ],
  },
  {
    label: "Commerce",
    items: [
      { id: "collections", label: "Collections", icon: Layers, count: 5 },
      { id: "offers", label: "Offers", icon: Tag, count: 5 },
    ],
  },
  {
    label: "Structure",
    items: [
      { id: "navigation", label: "Navigation", icon: Menu },
      { id: "design", label: "Design", icon: Palette },
      { id: "domains", label: "Domains", icon: Globe },
      { id: "seo", label: "SEO & Redirects", icon: Search },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const { toggle } = useTheme();

  const tenant = useAuthStore(selectTenant);
  const user = useAuthStore(selectUser);

  const workspace = (params?.workspace as string) || "";

  // Derive active from pathname
  const active = pathname.includes("/site/")
    ? pathname.split("/site/")[1]?.split("/")[0] || "dashboard"
    : "dashboard";

  const handleNav = (id: string) => {
    router.push(`/${workspace}/site/${id}`);
  };

  const handleThemeToggle = () => {
    toggle();
  };

  return (
    <aside
      style={{
        width: "var(--side-w)",
        borderRight: "1px solid var(--line)",
        background: "var(--bg-sunken)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Workspace switcher */}
      <div
        style={{
          padding: "12px 12px 10px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background:
                "linear-gradient(135deg, oklch(0.4 0.08 30), oklch(0.25 0.05 30))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 11,
              fontFamily: "var(--font-serif)",
            }}
          >
            {tenant?.slug?.[0]?.toUpperCase() || "L"}
          </div>
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 1.2,
                color: "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tenant?.name || "Workspace"}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                lineHeight: 1.2,
              }}
            >
              {tenant?.slug || "workspace"} · {tenant?.plan || "pro"}
            </div>
          </div>
          <ChevronDown size={12} style={{ color: "var(--ink-4)" }} />
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: "10px 10px 4px" }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-cmdk"))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            height: 28,
            padding: "0 8px",
            borderRadius: 6,
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            color: "var(--ink-4)",
            fontSize: 12,
          }}
        >
          <Search size={13} />
          <span style={{ flex: 1, textAlign: "left" }}>Search & jump…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 6px 10px",
        }}
      >
        {NAV_GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 6 }}>
            <div
              className="mono"
              style={{
                padding: "8px 10px 4px",
                fontSize: 10,
                color: "var(--ink-4)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {g.label}
            </div>
            {g.items.map((it) => {
              const isActive = active === it.id;
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  onClick={() => handleNav(it.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "5px 8px",
                    borderRadius: 5,
                    marginBottom: 1,
                    background: isActive ? "var(--bg-active)" : "transparent",
                    color: isActive ? "var(--ink)" : "var(--ink-2)",
                    fontWeight: isActive ? 550 : 450,
                    fontSize: 12.5,
                    position: "relative",
                    textAlign: "left",
                  }}
                >
                  <Icon
                    size={15}
                    style={{
                      color: isActive ? "var(--accent)" : "var(--ink-3)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.count != null && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                      }}
                    >
                      {it.count}
                    </span>
                  )}
                  {it.badge && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "0 4px",
                        height: 14,
                        lineHeight: "14px",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        borderRadius: 3,
                      }}
                    >
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Avatar
          initials={
            user?.username
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || "?"
          }
          name={user?.username || "User"}
          size={26}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {user?.username || "User"}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              color: "var(--ink-4)",
            }}
          >
            {user?.role || "user"}
          </div>
        </div>
        <button
          title="Theme"
          onClick={handleThemeToggle}
          style={{
            width: 26,
            height: 26,
            borderRadius: 5,
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            background: "var(--bg-elev)",
          }}
        >
          <Moon size={13} />
        </button>
      </div>
    </aside>
  );
}
