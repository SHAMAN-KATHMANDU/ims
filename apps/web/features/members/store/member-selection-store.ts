"use client";

/**
 * Member selection store (multi-select for export). Built from createSelectionStore; single point of change there.
 */

import { create } from "zustand";
import { selectionStoreImpl } from "@/lib/create-selection-store";

interface MemberSelectionState {
  selectedMemberIds: Set<string>;
  addMember: (memberId: string) => void;
  removeMember: (memberId: string) => void;
  toggleMember: (memberId: string) => void;
  setMembers: (memberIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (memberId: string) => boolean;
}

export const useMemberSelectionStore = create<MemberSelectionState>()((
  set,
  get,
) => {
  const impl = selectionStoreImpl(
    set as (
      p:
        | Record<string, unknown>
        | ((s: Record<string, unknown>) => Record<string, unknown>),
    ) => void,
    get as unknown as () => Record<string, unknown>,
    "selectedMemberIds",
  );
  return {
    selectedMemberIds: new Set(),
    addMember: impl.add,
    removeMember: impl.remove,
    toggleMember: impl.toggle,
    setMembers: impl.set,
    clearSelection: impl.clearSelection,
    isSelected: impl.isSelected,
  };
});

export const selectSelectedMemberIds = (state: MemberSelectionState) =>
  state.selectedMemberIds;
export const selectMemberSelectionCount = (state: MemberSelectionState) =>
  state.selectedMemberIds.size;
export const selectIsMemberSelected = (state: MemberSelectionState) =>
  state.isSelected;
export const selectClearMemberSelection = (state: MemberSelectionState) =>
  state.clearSelection;
export const selectSetMembers = (state: MemberSelectionState) =>
  state.setMembers;
export const selectAddMember = (state: MemberSelectionState) => state.addMember;
export const selectRemoveMember = (state: MemberSelectionState) =>
  state.removeMember;
export const selectToggleMember = (state: MemberSelectionState) =>
  state.toggleMember;
