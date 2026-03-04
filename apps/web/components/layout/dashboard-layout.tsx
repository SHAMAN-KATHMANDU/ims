"use client";

import type React from "react";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useIsMobile } from "@/hooks/useMobile";
import { useSidebarStore } from "@/store/sidebar-store";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isOpen, setIsOpen, toggle, desktopSidebarOpen } = useSidebarStore();

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
      <Sidebar isOpen={isOpen} onToggle={() => toggle(isMobile)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={handleMenuClick} />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
