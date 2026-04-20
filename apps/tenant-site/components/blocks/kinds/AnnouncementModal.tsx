"use client";

/**
 * AnnouncementModal — client popup variant of the announcement-bar block.
 * Used for promo pushes (sale code, seasonal promo) where a top strip
 * doesn't have enough visual weight. Dismissal is persisted in
 * localStorage per `storageKey` so visitors aren't re-prompted.
 */

import { useEffect, useRef, useState } from "react";

export function AnnouncementModal({
  heading,
  text,
  link,
  ctaLabel = "Shop now",
  delaySeconds = 2,
  storageKey = "announcement-modal-dismissed",
}: {
  heading?: string;
  text: string;
  link?: string;
  ctaLabel?: string;
  delaySeconds?: number;
  storageKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "1") return;
    const timer = setTimeout(
      () => setOpen(true),
      Math.max(0, delaySeconds) * 1000,
    );
    return () => clearTimeout(timer);
  }, [delaySeconds, storageKey]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const focusTarget =
      dialogRef.current?.querySelector<HTMLElement>("a, button");
    focusTarget?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.55)",
      }}
      onClick={dismiss}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={heading ? "announcement-modal-title" : undefined}
        aria-describedby="announcement-modal-body"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: 460,
          width: "100%",
          background: "var(--color-background)",
          color: "var(--color-text)",
          borderRadius: "var(--radius)",
          padding: "2.25rem 1.75rem 1.75rem",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            background: "transparent",
            border: "none",
            color: "var(--color-muted)",
            fontSize: "1.4rem",
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {heading && (
          <h2
            id="announcement-modal-title"
            style={{
              fontSize: "clamp(1.4rem, 2.5vw, 1.85rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "0.75rem",
            }}
          >
            {heading}
          </h2>
        )}
        <p
          id="announcement-modal-body"
          style={{
            fontSize: "1rem",
            color: heading ? "var(--color-muted)" : "var(--color-text)",
            lineHeight: 1.6,
            marginBottom: link ? "1.5rem" : 0,
          }}
        >
          {text}
        </p>
        {link && (
          <a
            href={link}
            onClick={dismiss}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              padding: "0 1.5rem",
              background: "var(--color-text)",
              color: "var(--color-background)",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}
