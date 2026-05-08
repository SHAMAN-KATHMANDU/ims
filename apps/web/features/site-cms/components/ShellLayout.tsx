"use client";

import type { ReactNode, JSX } from "react";
import { BreadcrumbsProvider } from "../hooks/use-breadcrumbs";
import { useTheme } from "../hooks/use-theme";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { RecentRoutesTracker } from "./RecentRoutesTracker";
import "../tokens.css";

interface ShellLayoutProps {
  children: ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <BreadcrumbsProvider>
      <RecentRoutesTracker />
      <div
        data-cms-shell=""
        data-theme={theme === "dark" ? "dark" : undefined}
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Topbar />
          <main
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            {children}
          </main>
        </div>
        <CommandPalette />
      </div>
    </BreadcrumbsProvider>
  );
}
