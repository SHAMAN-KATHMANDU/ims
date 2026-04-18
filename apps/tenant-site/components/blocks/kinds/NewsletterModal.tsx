"use client";

/**
 * NewsletterModal — client-side auto-open / exit-intent newsletter capture.
 * Dismissal is persisted in localStorage so the same visitor is not
 * re-prompted. The inner form is decorative (no backend wiring yet) —
 * matching the inline NewsletterBand; real submission lands in a later phase.
 */

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "newsletter-modal-dismissed";

export function NewsletterModal({
  title = "Stay in the loop",
  subtitle = "Occasional updates — no spam, ever.",
  cta = "Subscribe",
  delaySeconds = 10,
  exitIntent = true,
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  delaySeconds?: number;
  exitIntent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (delaySeconds > 0) {
      timer = setTimeout(() => setOpen(true), delaySeconds * 1000);
    }

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) setOpen(true);
    };
    if (exitIntent) {
      document.addEventListener("mouseleave", onMouseLeave);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (exitIntent) document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [delaySeconds, exitIntent]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const input = dialogRef.current?.querySelector<HTMLInputElement>(
      'input[type="email"]',
    );
    input?.focus();

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
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      aria-hidden={false}
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
        aria-labelledby="newsletter-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: 440,
          width: "100%",
          background: "var(--color-background)",
          color: "var(--color-text)",
          borderRadius: "var(--radius)",
          padding: "2rem 1.75rem",
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
        <h2
          id="newsletter-modal-title"
          style={{
            fontSize: "clamp(1.35rem, 2.4vw, 1.75rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
        <form
          method="get"
          action=""
          style={{ display: "flex", gap: "0.5rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            dismiss();
          }}
        >
          <label htmlFor="newsletter-modal-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-modal-email"
            name="newsletter_email"
            type="email"
            required
            placeholder="Enter your email"
            style={{
              height: 44,
              padding: "0 1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "0.9rem",
              flex: 1,
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            style={{
              height: 44,
              padding: "0 1.25rem",
              background: "var(--color-primary)",
              color: "var(--color-on-primary, #fff)",
              border: "none",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {cta}
          </button>
        </form>
      </div>
    </div>
  );
}
