"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isOpen: boolean;
  desktopSidebarOpen: boolean; // Persisted state for desktop
  setIsOpen: (isOpen: boolean, isMobile?: boolean) => void;
  toggle: (isMobile?: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isOpen: true,
      desktopSidebarOpen: true,
      setIsOpen: (isOpen, isMobile = false) => {
        set({ isOpen });
        // Only persist desktop state
        if (!isMobile) {
          set({ desktopSidebarOpen: isOpen });
        }
      },
      toggle: (isMobile = false) => {
        const { isOpen } = get();
        const newState = !isOpen;
        set({ isOpen: newState });
        // Only persist desktop state
        if (!isMobile) {
          set({ desktopSidebarOpen: newState });
        }
      },
    }),
    {
      name: "sidebar-state",
      // Only persist desktop sidebar state
      partialize: (state) => ({ desktopSidebarOpen: state.desktopSidebarOpen }),
      // Sync isOpen with desktopSidebarOpen on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isOpen = state.desktopSidebarOpen;
        }
      },
    },
  ),
);
