"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY_PREFIX = "scroll-restore:";

/**
 * Persists and restores scroll position of an overflow container across page refreshes.
 * Uses sessionStorage so positions are cleared when the tab closes.
 * Uses MutationObserver to wait for sidebar/nav items to render before restoring,
 * so the scroll position is applied after content is available.
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

    let observer: MutationObserver | null = null;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const stored = sessionStorage.getItem(key);
    if (stored) {
      const scrollTop = parseInt(stored, 10);
      if (!Number.isNaN(scrollTop) && scrollTop > 0) {
        const restore = () => {
          if (isRestoringRef.current) return;
          isRestoringRef.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.scrollTop = scrollTop;
              setTimeout(() => {
                isRestoringRef.current = false;
              }, 50);
            });
          });
        };

        // Wait for sidebar items to render via MutationObserver before restoring.
        // This avoids restoring too early when the scroll container is empty.
        observer = new MutationObserver(() => {
          restore();
          observer?.disconnect();
          observer = null;
          if (fallback) clearTimeout(fallback);
        });
        observer.observe(el, {
          childList: true,
          subtree: true,
        });

        // Fallback: restore after a short delay in case no mutation fires
        // (e.g. content already present or server-rendered).
        fallback = setTimeout(() => {
          if (observer) {
            observer.disconnect();
            restore();
          }
          fallback = undefined;
        }, 300);
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
      observer?.disconnect();
      if (fallback) clearTimeout(fallback);
      el.removeEventListener("scroll", save);
      window.removeEventListener("beforeunload", beforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [ref, key]);
}
