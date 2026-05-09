"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme: Theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return localStorage;
        return localStorage;
      }),
      version: 1,
    },
  ),
);

export const selectTheme = (s: ThemeStore) => s.theme;
export const selectThemeToggle = (s: ThemeStore) => s.toggleTheme;
