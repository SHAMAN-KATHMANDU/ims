"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface TrashSelectionState {
  /** Composite keys: `${entityType}:${id}` */
  selectedTrashKeys: Set<string>;

  addTrashKey: (key: string) => void;
  removeTrashKey: (key: string) => void;
  toggleTrashKey: (key: string) => void;
  setTrashKeys: (keys: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (key: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useTrashSelectionStore = create<TrashSelectionState>()(
  (set, get) => ({
    selectedTrashKeys: new Set(),

    addTrashKey: (key) => {
      set((state) => {
        const next = new Set(state.selectedTrashKeys);
        next.add(key);
        return { selectedTrashKeys: next };
      });
    },

    removeTrashKey: (key) => {
      set((state) => {
        const next = new Set(state.selectedTrashKeys);
        next.delete(key);
        return { selectedTrashKeys: next };
      });
    },

    toggleTrashKey: (key) => {
      set((state) => {
        const next = new Set(state.selectedTrashKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return { selectedTrashKeys: next };
      });
    },

    setTrashKeys: (keys) => {
      set({ selectedTrashKeys: new Set(keys) });
    },

    clearSelection: () => {
      set({ selectedTrashKeys: new Set() });
    },

    isSelected: (key) => get().selectedTrashKeys.has(key),
  }),
);

// ============================================
// Selectors
// ============================================

export const selectSelectedTrashKeys = (state: TrashSelectionState) =>
  state.selectedTrashKeys;
export const selectTrashSelectionCount = (state: TrashSelectionState) =>
  state.selectedTrashKeys.size;
export const selectClearTrashSelection = (state: TrashSelectionState) =>
  state.clearSelection;
