"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================
// Types
// ============================================

interface SidebarState {
  // State
  isOpen: boolean;
  desktopSidebarOpen: boolean;

  // Actions
  setIsOpen: (isOpen: boolean, isMobile?: boolean) => void;
  toggle: (isMobile?: boolean) => void;
}

// ============================================
// Store
// ============================================

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: true,
      desktopSidebarOpen: true,

      // Actions
      setIsOpen: (isOpen, isMobile = false) => {
        set({ isOpen });
        if (!isMobile) {
          set({ desktopSidebarOpen: isOpen });
        }
      },

      toggle: (isMobile = false) => {
        const { isOpen } = get();
        const newState = !isOpen;
        set({ isOpen: newState });
        if (!isMobile) {
          set({ desktopSidebarOpen: newState });
        }
      },
    }),
    {
      name: "sidebar-state",
      partialize: (state) => ({ desktopSidebarOpen: state.desktopSidebarOpen }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isOpen = state.desktopSidebarOpen;
        }
      },
    },
  ),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const selectIsOpen = (state: SidebarState) => state.isOpen;
export const selectDesktopSidebarOpen = (state: SidebarState) =>
  state.desktopSidebarOpen;
export const selectToggle = (state: SidebarState) => state.toggle;
export const selectSetIsOpen = (state: SidebarState) => state.setIsOpen;
