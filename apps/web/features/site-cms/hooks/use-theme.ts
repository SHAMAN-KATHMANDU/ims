"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = "site-cms-theme";
const SHELL_SELECTOR = "[data-cms-shell]";

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = stored || "light";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  // Listen for global toggle-theme event
  useEffect(() => {
    const handleToggleTheme = () => {
      setThemeState((prev) => {
        const newTheme = prev === "light" ? "dark" : "light";
        applyTheme(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        return newTheme;
      });
    };

    window.addEventListener("toggle-theme", handleToggleTheme);
    return () => window.removeEventListener("toggle-theme", handleToggleTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  return { theme: mounted ? theme : "light", setTheme, toggle };
}

function applyTheme(theme: Theme): void {
  const shell = document.querySelector(SHELL_SELECTOR);
  if (!shell) return;

  if (theme === "dark") {
    (shell as HTMLElement).setAttribute("data-theme", "dark");
  } else {
    (shell as HTMLElement).removeAttribute("data-theme");
  }
}
