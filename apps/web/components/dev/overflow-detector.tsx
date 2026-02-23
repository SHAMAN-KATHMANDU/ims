"use client";

import { useEffect } from "react";

export function OverflowDetector() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (process.env.NEXT_PUBLIC_DEBUG_OVERFLOW !== "true") return;

    const checkOverflow = () => {
      const viewportWidth = window.innerWidth;
      const overflowing = Array.from(
        document.querySelectorAll<HTMLElement>("body *"),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > viewportWidth + 1 || rect.right > viewportWidth + 1;
      });

      if (overflowing.length === 0) return;

      const details = overflowing.slice(0, 25).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className,
          width: Math.round(rect.width),
          right: Math.round(rect.right),
        };
      });

      console.groupCollapsed(
        `[overflow-detector] ${overflowing.length} elements exceed viewport`,
      );
      console.table(details);
      console.groupEnd();
    };

    const timeout = window.setTimeout(checkOverflow, 200);
    window.addEventListener("resize", checkOverflow);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", checkOverflow);
    };
  }, []);

  return null;
}
