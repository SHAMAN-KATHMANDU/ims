"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentRoute {
  path: string;
  label: string;
  timestamp: number;
}

interface RecentRoutesStore {
  routes: RecentRoute[];
  addRoute: (path: string, label: string) => void;
}

export const useRecentRoutes = create<RecentRoutesStore>()(
  persist(
    (set) => ({
      routes: [],
      addRoute: (path: string, label: string) => {
        set((state) => {
          // Filter out duplicates and keep only last 3 routes
          const filtered = state.routes.filter((r) => r.path !== path);
          const updated = [
            { path, label, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 3);
          return { routes: updated };
        });
      },
    }),
    {
      name: "site-cms-recent-routes",
    },
  ),
);
