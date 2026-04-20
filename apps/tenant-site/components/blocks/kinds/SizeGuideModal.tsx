"use client";

/**
 * SizeGuideModal — native <dialog> wrapper that opens via a trigger
 * button. The browser handles focus trap + Esc key + backdrop click
 * (we map backdrop click to close ourselves since HTMLDialogElement's
 * default is click-to-ignore).
 */

import { useRef, type ReactNode } from "react";

interface Props {
  triggerLabel: string;
  children: ReactNode;
}

export function SizeGuideModal({ triggerLabel, children }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);

  const open = () => {
    ref.current?.showModal();
  };

  const close = () => {
    ref.current?.close();
  };

  const onBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="btn"
        style={{
          background: "transparent",
          color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          minHeight: 44,
          padding: "0.5rem 1rem",
          fontSize: "0.88rem",
        }}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        onClick={onBackdrop}
        aria-labelledby="size-guide-heading"
        style={{
          border: "none",
          borderRadius: "var(--radius)",
          padding: 0,
          background: "var(--color-background)",
          color: "var(--color-text)",
          maxWidth: 720,
          width: "calc(100% - 2rem)",
        }}
      >
        <div style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close size guide"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-muted)",
                fontSize: "1.5rem",
                lineHeight: 1,
                padding: "0.25rem 0.5rem",
                minHeight: 44,
                minWidth: 44,
              }}
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
