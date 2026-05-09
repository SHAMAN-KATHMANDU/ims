"use client";

import { create } from "zustand";

interface CmdKStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCmdKStore = create<CmdKStore>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));

export const selectCmdKOpen = (s: CmdKStore) => s.open;
export const selectCmdKSetOpen = (s: CmdKStore) => s.setOpen;
export const selectCmdKToggle = (s: CmdKStore) => s.toggle;
