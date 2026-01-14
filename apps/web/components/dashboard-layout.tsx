"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useIsMobile } from "@/hooks/use-mobile";

const SIDEBAR_STORAGE_KEY = "sidebar_open_state";

// Get initial sidebar state from localStorage (only for desktop)
function getInitialSidebarState(): boolean {
  if (typeof window === "undefined") {
    return true; // SSR default
  }
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return stored !== null ? stored === "true" : true; // Default to open if not stored
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    getInitialSidebarState(),
  );

  // Update sidebar state when mobile state changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      // On desktop, load from localStorage
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored !== null) {
        setSidebarOpen(stored === "true");
      }
    }
  }, [isMobile]);

  // Persist sidebar state to localStorage when it changes (only for desktop)
  useEffect(() => {
    if (typeof window !== "undefined" && !isMobile) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    }
  }, [sidebarOpen, isMobile]);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
