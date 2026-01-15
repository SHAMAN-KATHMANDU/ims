"use client";

import type React from "react";

import { useEffect, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarStore } from "@/stores/sidebar-store";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isOpen, setIsOpen, toggle, desktopSidebarOpen } = useSidebarStore();

  // Determine the actual sidebar state based on device type
  const sidebarOpen = useMemo(() => {
    if (isMobile) {
      // On mobile, use current state (controlled by user interaction)
      return isOpen;
    }
    // On desktop, use persisted state
    return desktopSidebarOpen;
  }, [isMobile, isOpen, desktopSidebarOpen]);

  // Update sidebar state when mobile state changes
  useEffect(() => {
    if (isMobile) {
      // On mobile, always start closed
      setIsOpen(false, true);
    } else {
      // On desktop, restore persisted state
      setIsOpen(desktopSidebarOpen, false);
    }
  }, [isMobile, setIsOpen, desktopSidebarOpen]);

  const handleMenuClick = () => {
    toggle(isMobile);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={toggle} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
