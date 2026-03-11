"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY_PREFIX = "scroll-restore:";

/**
 * Persists and restores scroll position of an overflow container across page refreshes.
 * Uses sessionStorage so positions are cleared when the tab closes.
 */
export function useScrollRestoration(
  ref: React.RefObject<HTMLElement | null>,
  storageKey: string,
  options?: { pathname?: string },
) {
  const key = options?.pathname
    ? `${SESSION_KEY_PREFIX}${storageKey}:${options.pathname}`
    : `${SESSION_KEY_PREFIX}${storageKey}`;

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const stored = sessionStorage.getItem(key);
    if (stored) {
      const scrollTop = parseInt(stored, 10);
      if (!Number.isNaN(scrollTop) && scrollTop > 0) {
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.scrollTop = scrollTop;
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 50);
          });
        });
      }
    }

    const save = () => {
      if (isRestoringRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        sessionStorage.setItem(key, String(el.scrollTop));
      }, 100);
    };

    el.addEventListener("scroll", save, { passive: true });
    const beforeUnload = () =>
      sessionStorage.setItem(key, String(el.scrollTop));
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      el.removeEventListener("scroll", save);
      window.removeEventListener("beforeunload", beforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [ref, key]);
}
