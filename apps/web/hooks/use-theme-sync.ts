"use client";

import { useEffect } from "react";
import { useThemeStore, selectTheme } from "@/store/theme-store";

export function useThemeSync(): void {
  const theme = useThemeStore(selectTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);
}
