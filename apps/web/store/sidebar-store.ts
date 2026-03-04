"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================
// Types
// ============================================

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 420;
const DEFAULT_SIDEBAR_WIDTH = 256;

interface SidebarState {
  // State
  isOpen: boolean;
  desktopSidebarOpen: boolean;
  sidebarWidth: number;

  // Actions
  setIsOpen: (isOpen: boolean, isMobile?: boolean) => void;
  toggle: (isMobile?: boolean) => void;
  setSidebarWidth: (width: number) => void;
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
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

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

      setSidebarWidth: (width) => {
        const w = Math.min(
          MAX_SIDEBAR_WIDTH,
          Math.max(MIN_SIDEBAR_WIDTH, width),
        );
        set({ sidebarWidth: w });
      },
    }),
    {
      name: "sidebar-state",
      partialize: (state) => ({
        desktopSidebarOpen: state.desktopSidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isOpen = state.desktopSidebarOpen;
          if (
            state.sidebarWidth == null ||
            state.sidebarWidth < MIN_SIDEBAR_WIDTH ||
            state.sidebarWidth > MAX_SIDEBAR_WIDTH
          ) {
            state.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
          }
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
export const selectSidebarWidth = (state: SidebarState) => state.sidebarWidth;
export const selectSetSidebarWidth = (state: SidebarState) =>
  state.setSidebarWidth;
export const selectToggle = (state: SidebarState) => state.toggle;
export const selectSetIsOpen = (state: SidebarState) => state.setIsOpen;
