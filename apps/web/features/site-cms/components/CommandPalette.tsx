"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Plus,
  Upload,
  Users,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useRecentRoutes } from "../hooks/use-recent-routes";
import type { JSX } from "react";

interface CmdkItem {
  label: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  target?: string;
  action?: string;
  kbd?: string;
  hint?: string;
}

interface CmdkGroup {
  group: string;
  items: CmdkItem[];
}

const getInitialItems = (): CmdkGroup[] => [
  {
    group: "Jump to",
    items: [
      { label: "Dashboard", icon: Home, target: "dashboard" },
      { label: "Pages", icon: FileText, target: "pages" },
      { label: "Blog", icon: Newspaper, target: "blog" },
      { label: "Blocks", icon: Boxes, target: "blocks" },
      { label: "Navigation", icon: Menu, target: "navigation" },
      { label: "Design", icon: Palette, target: "design" },
      { label: "Domains", icon: Globe, target: "domains" },
      { label: "Media", icon: Image, target: "media" },
      { label: "Snippets", icon: Code, target: "snippets" },
      { label: "Collections", icon: Layers, target: "collections" },
      { label: "Offers", icon: Tag, target: "offers" },
      { label: "SEO & Redirects", icon: Search, target: "seo" },
      { label: "Settings", icon: Settings, target: "settings" },
    ],
  },
  {
    group: "Actions",
    items: [
      { label: "New page", icon: Plus, action: "new-page", kbd: "N P" },
      { label: "New blog post", icon: Plus, action: "new-post", kbd: "N B" },
      { label: "Upload media", icon: Upload, action: "upload" },
      { label: "Add redirect", icon: Search, action: "redirect" },
      { label: "Invite teammate", icon: Users, action: "invite" },
      { label: "Toggle theme", icon: Palette, action: "theme", kbd: "⌘ ⇧ L" },
      { label: "View live site", icon: ExternalLink, action: "live" },
    ],
  },
];

export function CommandPalette(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params.workspace || "";

  const { routes: recentRoutes } = useRecentRoutes();

  // Filter items based on query
  const filtered = useMemo(() => {
    const base = getInitialItems();
    const items = base
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.label.toLowerCase().includes(query.toLowerCase()),
        ),
      }))
      .filter((g) => g.items.length > 0);

    // Add recent items if no query
    if (query === "" && recentRoutes.length > 0) {
      items.push({
        group: "Recent",
        items: recentRoutes.slice(0, 3).map((r) => ({
          label: r.label,
          icon: FileText,
          target: r.path.split("/").pop(),
          hint: "edited recently",
        })),
      });
    }

    return items;
  }, [query, recentRoutes]);

  const flatList = useMemo(() => filtered.flatMap((g) => g.items), [filtered]);

  // Reset index when query changes
  useEffect(() => {
    setIdx(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Listen for open-cmdk event
  useEffect(() => {
    const handleOpenCmdk = () => setOpen(true);
    window.addEventListener("open-cmdk", handleOpenCmdk);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "l") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-theme"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-cmdk", handleOpenCmdk);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, flatList.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = flatList[idx];
      if (item) {
        if (item.target) {
          router.push(`/${workspace}/site/${item.target}`);
        }
        if (item.action === "theme") {
          window.dispatchEvent(new CustomEvent("toggle-theme"));
        }
        if (item.action === "new-page") {
          router.push(`/${workspace}/site/pages/new`);
        }
        if (item.action === "new-post") {
          router.push(`/${workspace}/site/blog/new`);
        }
        setOpen(false);
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return <></>;

  let runIdx = -1;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 580,
          maxWidth: "92vw",
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          height: "fit-content",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Search size={16} style={{ color: "var(--ink-4)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, posts, actions…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <span className="kbd">esc</span>
        </div>

        {/* Items */}
        <div
          style={{
            maxHeight: 420,
            overflow: "auto",
            padding: "6px 0",
          }}
        >
          {flatList.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--ink-4)",
                fontSize: 13,
              }}
            >
              No results.
            </div>
          )}
          {filtered.map((g) => (
            <div key={g.group}>
              <div
                className="mono"
                style={{
                  padding: "10px 14px 4px",
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {g.group}
              </div>
              {g.items.map((it) => {
                runIdx++;
                const sel = runIdx === idx;
                const Icon = it.icon;
                return (
                  <button
                    key={it.label}
                    onMouseEnter={() => setIdx(runIdx)}
                    onClick={() =>
                      handleKeyDown({
                        key: "Enter",
                        preventDefault: () => {},
                      } as React.KeyboardEvent<HTMLInputElement>)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "7px 14px",
                      background: sel ? "var(--bg-active)" : "transparent",
                      color: "var(--ink)",
                      fontSize: 13,
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={14} style={{ color: "var(--ink-3)" }} />
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.hint && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: "var(--ink-4)",
                        }}
                      >
                        {it.hint}
                      </span>
                    )}
                    {it.kbd && <span className="kbd">{it.kbd}</span>}
                    {sel && (
                      <ChevronRight
                        size={12}
                        style={{ color: "var(--ink-4)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 11,
            color: "var(--ink-4)",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span className="kbd">↑↓</span> navigate
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span className="kbd">↵</span> open
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span className="kbd">esc</span> close
          </span>
          <span style={{ flex: 1 }} />
          <span className="mono">Site</span>
        </div>
      </div>
    </div>
  );
}
