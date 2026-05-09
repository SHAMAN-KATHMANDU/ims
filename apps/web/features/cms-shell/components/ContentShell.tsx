"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CmdK } from "./CmdK";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useGlobalShortcuts } from "@/features/cms-shell/hooks/use-global-shortcuts";

interface ContentShellProps {
  children: ReactNode;
}

export function ContentShell({ children }: ContentShellProps) {
  useThemeSync();
  useGlobalShortcuts();

  const pathname = usePathname();
  const isBuilderRoute = pathname.includes("/content/builder/");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
        {!isBuilderRoute && <Topbar />}
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
      <CmdK />
    </div>
  );
}
