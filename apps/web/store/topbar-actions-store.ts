"use client";

import { ReactNode } from "react";
import { create } from "zustand";

interface TopbarActionsStore {
  actions: ReactNode | null;
  setActions: (actions: ReactNode | null) => void;
}

export const useTopbarActionsStore = create<TopbarActionsStore>((set) => ({
  actions: null,
  setActions: (actions: ReactNode | null) => set({ actions }),
}));
