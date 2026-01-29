"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface MemberSelectionState {
  // State
  selectedMemberIds: Set<string>;

  // Actions
  addMember: (memberId: string) => void;
  removeMember: (memberId: string) => void;
  toggleMember: (memberId: string) => void;
  setMembers: (memberIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (memberId: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useMemberSelectionStore = create<MemberSelectionState>()(
  (set, get) => ({
    // Initial state
    selectedMemberIds: new Set(),

    // Actions
    addMember: (memberId) => {
      set((state) => {
        const newSet = new Set(state.selectedMemberIds);
        newSet.add(memberId);
        return { selectedMemberIds: newSet };
      });
    },

    removeMember: (memberId) => {
      set((state) => {
        const newSet = new Set(state.selectedMemberIds);
        newSet.delete(memberId);
        return { selectedMemberIds: newSet };
      });
    },

    toggleMember: (memberId) => {
      set((state) => {
        const newSet = new Set(state.selectedMemberIds);
        if (newSet.has(memberId)) {
          newSet.delete(memberId);
        } else {
          newSet.add(memberId);
        }
        return { selectedMemberIds: newSet };
      });
    },

    setMembers: (memberIds) => {
      set({ selectedMemberIds: new Set(memberIds) });
    },

    clearSelection: () => {
      set({ selectedMemberIds: new Set() });
    },

    isSelected: (memberId) => {
      return get().selectedMemberIds.has(memberId);
    },
  }),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const selectSelectedMemberIds = (state: MemberSelectionState) =>
  state.selectedMemberIds;
export const selectMemberSelectionCount = (state: MemberSelectionState) =>
  state.selectedMemberIds.size;
export const selectIsMemberSelected = (state: MemberSelectionState) =>
  state.isSelected;
export const selectClearMemberSelection = (state: MemberSelectionState) =>
  state.clearSelection;
