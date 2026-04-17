"use client";

/**
 * Theme toggle — flips the html[data-theme] attribute between "light" and
 * "dark" and writes a site-theme cookie so the next SSR reads it back.
 *
 * The initial render picks up whatever the server put on <html data-theme>
 * (from themeTokens.mode, branding.theme, or the site-theme cookie), so
 * the button's state syncs on mount without causing a flash.
 */

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const COOKIE_NAME = "site-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCookie(value: "light" | "dark") {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    writeCookie(next);
  };

  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius)",
        border: "1px solid var(--color-border)",
        background: "transparent",
        color: "var(--color-text)",
        cursor: "pointer",
      }}
    >
      <Icon size={16} />
    </button>
  );
}
