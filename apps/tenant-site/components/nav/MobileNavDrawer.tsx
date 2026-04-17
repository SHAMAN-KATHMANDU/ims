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

import { useCallback, useEffect, useRef, useState } from "react";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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

  // Move focus into the panel on open; restore to trigger on close.
  // Skip focus restore on initial mount (open has never been true yet).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeBtnRef.current?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // Simple focus trap: Tab/Shift+Tab cycles within the panel while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-haspopup="dialog"
        className="tpl-mobile-only"
        style={{
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "0.4rem 0.6rem",
          minWidth: 44,
          minHeight: 44,
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
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        />
      )}

      <aside
        ref={panelRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Site navigation"
        aria-hidden={!open}
        style={panelStyle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label="Close menu"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.4rem",
              cursor: "pointer",
              color: "var(--color-text)",
              minWidth: 44,
              minHeight: 44,
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
