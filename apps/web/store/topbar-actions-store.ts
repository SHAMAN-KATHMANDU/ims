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

export const selectTopbarActions = (s: TopbarActionsStore) => s.actions;
export const selectTopbarActionsSetActions = (s: TopbarActionsStore) =>
  s.setActions;
