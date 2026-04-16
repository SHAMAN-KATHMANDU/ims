"use client";

/**
 * MobileNavDrawer — hamburger + off-canvas panel for mobile viewports.
 *
 * Only renders on small screens via the `tpl-mobile-only` utility class
 * (defined in globals.css). On larger viewports the existing desktop nav
 * is visible and this component is display:none, so keystroke/scroll lock
 * behavior is contained to the mobile experience.
 *
 * The drawer is a minimal controlled component — state is kept local and
 * the server-rendered items are passed in as props from SiteHeader. Sub-
 * drop­downs/mega-menus from the desktop nav are flattened one level: the
 * Phase 2 mobile drawer shows dropdown labels as accordion headings and
 * lists their items beneath. Deeper nesting collapses to one level.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@repo/shared";
import { SearchBar } from "@/components/search/SearchBar";

type DrawerStyle = "slide-left" | "slide-right" | "fullscreen";

type Props = {
  items: NavItem[];
  drawerStyle: DrawerStyle;
};

export function MobileNavDrawer({ items, drawerStyle }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    bottom: 0,
    width: drawerStyle === "fullscreen" ? "100%" : "min(320px, 85vw)",
    background: "var(--color-background)",
    borderLeft:
      drawerStyle === "slide-right"
        ? "1px solid var(--color-border)"
        : undefined,
    borderRight:
      drawerStyle === "slide-left"
        ? "1px solid var(--color-border)"
        : undefined,
    padding: "1.5rem",
    overflowY: "auto",
    zIndex: 60,
    transform: open
      ? "translateX(0)"
      : drawerStyle === "slide-left"
        ? "translateX(-100%)"
        : "translateX(100%)",
    transition: "transform 0.2s ease",
    [drawerStyle === "slide-left" ? "left" : "right"]: 0,
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Open menu"
        aria-expanded={open}
        className="tpl-mobile-only"
        style={{
          display: "none",
          background: "transparent",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "0.4rem 0.6rem",
          fontSize: "1.1rem",
          color: "var(--color-text)",
          cursor: "pointer",
        }}
      >
        ☰
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        />
      )}

      <aside style={panelStyle} aria-hidden={!open}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.4rem",
              cursor: "pointer",
              color: "var(--color-text)",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <SearchBar />
        </div>
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
            fontSize: "1.05rem",
          }}
        >
          {items.map((item, i) => (
            <MobileItem key={i} item={item} onNavigate={close} />
          ))}
        </nav>
      </aside>
    </>
  );
}

function MobileItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  if (item.kind === "link") {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        style={{ color: "var(--color-text)", textDecoration: "none" }}
      >
        {item.label}
      </Link>
    );
  }
  if (item.kind === "cta") {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        style={{
          background: "var(--color-primary)",
          color: "var(--color-on-primary, #fff)",
          padding: "0.6rem 1rem",
          borderRadius: "var(--radius)",
          textAlign: "center",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        {item.label}
      </Link>
    );
  }
  if (item.kind === "dropdown") {
    return (
      <details>
        <summary style={{ cursor: "pointer", color: "var(--color-text)" }}>
          {item.label}
        </summary>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            padding: "0.6rem 0 0.25rem 1rem",
          }}
        >
          {item.items.map((sub, i) => (
            <MobileItem key={i} item={sub} onNavigate={onNavigate} />
          ))}
        </div>
      </details>
    );
  }
  if (item.kind === "mega-column") {
    return (
      <details>
        <summary style={{ cursor: "pointer", color: "var(--color-text)" }}>
          {item.label}
        </summary>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            padding: "0.6rem 0 0.25rem 1rem",
          }}
        >
          {item.columns.map((col, ci) => (
            <div key={ci}>
              <div
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--color-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                {col.heading}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {col.items.map((sub, i) => (
                  <MobileItem key={i} item={sub} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }
  return null;
}
