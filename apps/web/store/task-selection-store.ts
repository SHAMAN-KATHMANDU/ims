"use client";

/**
 * Task selection store (multi-select for bulk actions). Built from createSelectionStore.
 */

import { create } from "zustand";
import { selectionStoreImpl } from "./createSelectionStore";

interface TaskSelectionState {
  selectedTaskIds: Set<string>;
  addTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  setTasks: (taskIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (taskId: string) => boolean;
}

export const useTaskSelectionStore = create<TaskSelectionState>()((set, get) => {
  const impl = selectionStoreImpl(
    set as (
      p:
        | Record<string, unknown>
        | ((s: Record<string, unknown>) => Record<string, unknown>),
    ) => void,
    get as unknown as () => Record<string, unknown>,
    "selectedTaskIds",
  );
  return {
    selectedTaskIds: new Set(),
    addTask: impl.add,
    removeTask: impl.remove,
    toggleTask: impl.toggle,
    setTasks: impl.set,
    clearSelection: impl.clearSelection,
    isSelected: impl.isSelected,
  };
});

export const selectSelectedTaskIds = (state: TaskSelectionState) =>
  state.selectedTaskIds;
export const selectClearTaskSelection = (state: TaskSelectionState) =>
  state.clearSelection;
