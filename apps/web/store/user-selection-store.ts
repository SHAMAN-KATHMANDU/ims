"use client";

/**
 * User selection store (multi-select for bulk actions). Built from createSelectionStore.
 */

import { create } from "zustand";
import { selectionStoreImpl } from "./createSelectionStore";

interface UserSelectionState {
  selectedUserIds: Set<string>;
  addUser: (userId: string) => void;
  removeUser: (userId: string) => void;
  toggleUser: (userId: string) => void;
  setUsers: (userIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (userId: string) => boolean;
}

export const useUserSelectionStore = create<UserSelectionState>()((set, get) => {
  const impl = selectionStoreImpl(
    set as (
      p:
        | Record<string, unknown>
        | ((s: Record<string, unknown>) => Record<string, unknown>),
    ) => void,
    get as unknown as () => Record<string, unknown>,
    "selectedUserIds",
  );
  return {
    selectedUserIds: new Set(),
    addUser: impl.add,
    removeUser: impl.remove,
    toggleUser: impl.toggle,
    setUsers: impl.set,
    clearSelection: impl.clearSelection,
    isSelected: impl.isSelected,
  };
});

export const selectSelectedUserIds = (state: UserSelectionState) =>
  state.selectedUserIds;
export const selectClearUserSelection = (state: UserSelectionState) =>
  state.clearSelection;
