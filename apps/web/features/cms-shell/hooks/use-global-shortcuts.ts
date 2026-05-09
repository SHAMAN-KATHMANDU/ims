"use client";

import { useEffect } from "react";
import { useCmdKStore } from "@/store/cmdk-store";
import { useThemeStore } from "@/store/theme-store";

export function useGlobalShortcuts(): void {
  const toggleCmdK = useCmdKStore((state) => state.toggle);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCmdK();
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "l") {
        e.preventDefault();
        toggleTheme();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCmdK, toggleTheme]);
}
