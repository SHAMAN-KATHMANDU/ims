/**
 * Header blocks — navigation, branding, utility strips.
 *
 * nav-bar       — sticky navigation with logo, menu, search, cart
 * logo-mark     — standalone brand/logo display
 * utility-bar   — top strip with secondary navigation/utility links
 */

import React from "react";
import Link from "next/link";
import type { BlockComponentProps } from "../registry";

// ---------- nav-bar ---------------------------------------------------------

export interface NavBarProps {
  brand: string;
  brandHref?: string;
  brandStyle?: "serif" | "sans" | "mono";
  items?: Array<{
    label: string;
    href: string;
    hasMegaMenu?: boolean;
  }>;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  cartCount?: number;
  sticky?: boolean;
  align?: "between" | "center";
}

export function NavBarBlock({ props }: BlockComponentProps<NavBarProps>) {
  const {
    brand = "Shaman",
    brandHref = "/",
    brandStyle = "serif",
    items = [],
    showSearch = true,
    showCart = true,
    showAccount = false,
    cartCount = 0,
    sticky = true,
    align = "between",
  } = props;

  const isCentered = align === "center";
  const brandClasses = [
    "text-base no-underline",
    "text-[var(--t-text)]",
    "hover:opacity-70 transition-opacity",
    brandStyle === "serif" && "font-serif text-lg tracking-tight",
    brandStyle === "mono" && "font-mono tracking-wider text-sm uppercase",
  ]
    .filter(Boolean)
    .join(" ");

  const headerClasses = [
    "w-full border-b",
    sticky && "sticky top-0 z-50",
    "px-6 md:px-12 py-4 md:py-5",
    "bg-[var(--t-bg)]",
  ]
    .filter(Boolean)
    .join(" ");

  const brandElement = (
    <Link href={brandHref} className={brandClasses}>
      {brand}
    </Link>
  );

  // Tailwind needs class names to be statically resolvable, so the gap
  // template-string `gap-${isCentered ? 8 : 6}` was producing zero gap at
  // runtime — items rendered as "LivingDiningBedroomOutdoor". Pin the
  // class names instead.
  const navElement = items.length > 0 && (
    <nav
      className={`hidden md:flex ${isCentered ? "gap-8" : "gap-6"} text-sm text-[var(--t-text)]`}
    >
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="no-underline text-[var(--t-text)] hover:opacity-70 transition-opacity inline-flex items-center gap-1"
        >
          {item.label}
          {item.hasMegaMenu && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.6"
            >
              <path d="M3 5l3 3 3-3" />
            </svg>
          )}
        </Link>
      ))}
    </nav>
  );

  const actionsElement = (
    <div className="flex items-center gap-3 text-[var(--t-text)]">
      {showSearch && (
        <button className="hover:opacity-70" aria-label="Search">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      )}
      {showAccount && (
        <button className="hover:opacity-70" aria-label="Account">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21c0-4 2-6 6-6s6 2 6 6" />
          </svg>
        </button>
      )}
      {showCart && (
        <button className="relative hover:opacity-70" aria-label="Cart">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full grid place-items-center text-[9px] text-white font-semibold"
              style={{ background: "var(--t-primary)" }}
            >
              {cartCount}
            </span>
          )}
        </button>
      )}
    </div>
  );

  if (isCentered) {
    return (
      <header className={headerClasses}>
        <div className="flex items-center justify-between mb-3">
          <div className="opacity-0 pointer-events-none hidden md:block">
            {actionsElement}
          </div>
          {brandElement}
          {actionsElement}
        </div>
        <div className="flex justify-center">{navElement}</div>
      </header>
    );
  }

  return (
    <header className={headerClasses}>
      <div className="flex items-center justify-between gap-6">
        {brandElement}
        {navElement}
        {actionsElement}
      </div>
    </header>
  );
}

// ---------- logo-mark -------------------------------------------------------

export interface LogoMarkProps {
  brand: string;
  href?: string;
  subtitle?: string;
  align?: "start" | "center" | "end";
  variant?: "text-only" | "with-icon";
}

export function LogoMarkBlock({ props }: BlockComponentProps<LogoMarkProps>) {
  const {
    brand = "Shaman",
    href = "/",
    subtitle,
    align = "center",
    variant = "text-only",
  } = props;

  const alignClasses = {
    start: "items-start text-left",
    center: "items-center text-center",
    end: "items-end text-right",
  }[align];

  return (
    <div className={`flex flex-col py-4 ${alignClasses}`}>
      <Link
        href={href}
        className="no-underline text-[var(--t-text)] hover:opacity-70 transition-opacity"
      >
        <div className="font-serif text-[28px] tracking-tight leading-[1] text-[var(--t-text)]">
          {brand}
        </div>
        {subtitle && (
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--t-muted)] mt-1">
            {subtitle}
          </div>
        )}
      </Link>
    </div>
  );
}

// ---------- utility-bar -----------------------------------------------------

export interface UtilityBarProps {
  items?: Array<{
    label: string;
    href: string;
  }>;
  align?: "start" | "center" | "end" | "between";
}

export function UtilityBarBlock({
  props,
}: BlockComponentProps<UtilityBarProps>) {
  const { items = [], align = "start" } = props;

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }[align];

  return (
    <div
      className={`w-full text-[11.5px] tracking-wide text-[var(--t-muted)] flex items-center flex-wrap gap-x-6 gap-y-1 ${justifyClasses}`}
    >
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="no-underline text-[var(--t-muted)] hover:text-[var(--t-text)] transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
