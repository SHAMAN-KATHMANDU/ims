/**
 * Footer blocks — link columns, social, payment methods, copyright.
 *
 * footer-columns    — multi-column footer with optional brand column
 * social-links      — social media icon/link row
 * payment-icons     — payment method badges
 * copyright-bar     — © line with optional nav links
 */

import React from "react";
import Link from "next/link";
import type { BlockComponentProps } from "../registry";

// ---------- footer-columns --------------------------------------------------

export interface FooterColumnsProps {
  showBrand?: boolean;
  brand?: string;
  tagline?: string;
  columns?: Array<{
    title: string;
    links?: Array<{
      label: string;
      href: string;
    }>;
  }>;
}

export function FooterColumnsBlock({
  props,
}: BlockComponentProps<FooterColumnsProps>) {
  const {
    showBrand = true,
    brand = "Shaman Goods",
    tagline,
    columns = [],
  } = props;

  const totalCols = (showBrand ? 1 : 0) + columns.length;
  const gridCols = Math.max(2, Math.min(totalCols, 5));

  return (
    <div
      className="grid gap-10"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0,1fr))` }}
    >
      {showBrand && (
        <div className="flex flex-col gap-2 md:col-span-1">
          <div className="font-serif text-[20px] text-[var(--t-text)] leading-tight">
            {brand}
          </div>
          {tagline && (
            <div className="text-[12.5px] text-[var(--t-muted)] leading-[1.6] max-w-[22rem]">
              {tagline}
            </div>
          )}
        </div>
      )}
      {columns.map((col, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--t-muted)] font-medium">
            {col.title}
          </div>
          <ul className="flex flex-col gap-2 text-[13px] text-[var(--t-text)] m-0 p-0 list-none">
            {(col.links || []).map((link, j) => (
              <li key={j}>
                <Link
                  href={link.href}
                  className="no-underline text-[var(--t-text)] hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------- social-links ---------------------------------------------------

const SOCIAL_ICONS: Record<string, (size: number) => React.ReactElement> = {
  instagram: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  pinterest: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M11 7c3 0 5 2 5 4.5s-2 4.5-4 4.5c-.8 0-1.5-.4-1.8-1l-.8 3.3c-.2.8-.7 1.7-1 2.3" />
    </svg>
  ),
  twitter: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M4 4l7.5 10L4 20h2l6-6 4 6h4l-7.5-10L20 4h-2l-5 5-3-5Z"
        fill="currentColor"
      />
    </svg>
  ),
  youtube: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 6 3-6 3Z" fill="currentColor" />
    </svg>
  ),
  tiktok: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M14 4v10a3 3 0 1 1-3-3" />
      <path d="M14 4c.5 2.5 2 4 5 4" />
    </svg>
  ),
  facebook: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M16 4h-2a3 3 0 0 0-3 3v3H8v3h3v8h3v-8h3l.5-3H14V7.5c0-.4.2-.5.6-.5H16V4Z" />
    </svg>
  ),
  linkedin: (s) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" />
    </svg>
  ),
};

export interface SocialLinksProps {
  items?: Array<{
    platform: string;
    handle?: string;
    href: string;
  }>;
  variant?: "text" | "icons-only" | "icons-pill";
  align?: "start" | "center" | "end";
}

export function SocialLinksBlock({
  props,
}: BlockComponentProps<SocialLinksProps>) {
  const { items = [], variant = "text", align = "start" } = props;

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  }[align];

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${justifyClasses}`}
    >
      {items.map((item, i) => {
        const IconComponent = SOCIAL_ICONS[item.platform];

        if (variant === "icons-only") {
          return (
            <Link
              key={i}
              href={item.href}
              aria-label={item.platform}
              className="h-9 w-9 grid place-items-center rounded-full border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface)] transition-colors"
            >
              {IconComponent ? IconComponent(15) : null}
            </Link>
          );
        }

        if (variant === "icons-pill") {
          return (
            <Link
              key={i}
              href={item.href}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-[var(--t-border)] text-[12.5px] text-[var(--t-text)] no-underline hover:bg-[var(--t-surface)]"
            >
              {IconComponent ? IconComponent(13) : null}
              <span>{item.handle || item.platform}</span>
            </Link>
          );
        }

        return (
          <Link
            key={i}
            href={item.href}
            className="inline-flex items-center gap-2 text-[12.5px] text-[var(--t-text)] no-underline hover:opacity-70"
          >
            {IconComponent ? IconComponent(14) : null}
            <span>{item.handle || item.platform}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ---------- payment-icons --------------------------------------------------

export interface PaymentIconsProps {
  items?: Array<{
    name: string;
  }>;
  variant?: "flat" | "outlined";
  align?: "start" | "center" | "end";
}

export function PaymentIconsBlock({
  props,
}: BlockComponentProps<PaymentIconsProps>) {
  const { items = [], variant = "flat", align = "start" } = props;

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  }[align];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${justifyClasses}`}>
      {items.map((item, i) => (
        <div
          key={i}
          className={`h-7 px-2.5 rounded text-[10px] font-mono tracking-wider text-[var(--t-muted)] grid place-items-center ${
            variant === "outlined"
              ? "border border-[var(--t-border)]"
              : "bg-[var(--t-surface)] border border-[var(--t-border)]"
          }`}
        >
          {(item.name || "").toUpperCase()}
        </div>
      ))}
    </div>
  );
}

// ---------- copyright-bar ---------------------------------------------------

export interface CopyrightBarProps {
  copy: string;
  showLinks?: boolean;
  items?: Array<{
    label: string;
    href: string;
  }>;
}

export function CopyrightBarBlock({
  props,
}: BlockComponentProps<CopyrightBarProps>) {
  const {
    copy = "© 2026 Shaman Goods. All rights reserved.",
    showLinks = true,
    items = [],
  } = props;

  return (
    <div
      className="flex items-center justify-between flex-wrap gap-4 pt-5 border-t text-[11.5px] text-[var(--t-muted)]"
      style={{ borderColor: "var(--t-border)" }}
    >
      <span>{copy}</span>
      {showLinks && items.length > 0 && (
        <div className="flex items-center gap-5">
          {items.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className="no-underline text-[var(--t-muted)] hover:text-[var(--t-text)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
