"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface VendorSelectionState {
  selectedVendorIds: Set<string>;
  addVendor: (vendorId: string) => void;
  removeVendor: (vendorId: string) => void;
  toggleVendor: (vendorId: string) => void;
  setVendors: (vendorIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (vendorId: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useVendorSelectionStore = create<VendorSelectionState>()(
  (set, get) => ({
    selectedVendorIds: new Set(),

    addVendor: (vendorId) => {
      set((state) => {
        const newSet = new Set(state.selectedVendorIds);
        newSet.add(vendorId);
        return { selectedVendorIds: newSet };
      });
    },

    removeVendor: (vendorId) => {
      set((state) => {
        const newSet = new Set(state.selectedVendorIds);
        newSet.delete(vendorId);
        return { selectedVendorIds: newSet };
      });
    },

    toggleVendor: (vendorId) => {
      set((state) => {
        const newSet = new Set(state.selectedVendorIds);
        if (newSet.has(vendorId)) {
          newSet.delete(vendorId);
        } else {
          newSet.add(vendorId);
        }
        return { selectedVendorIds: newSet };
      });
    },

    setVendors: (vendorIds) => {
      set({ selectedVendorIds: new Set(vendorIds) });
    },

    clearSelection: () => {
      set({ selectedVendorIds: new Set() });
    },

    isSelected: (vendorId) => {
      return get().selectedVendorIds.has(vendorId);
    },
  }),
);

// ============================================
// Selectors
// ============================================

export const selectSelectedVendorIds = (state: VendorSelectionState) =>
  state.selectedVendorIds;
export const selectClearSelection = (state: VendorSelectionState) =>
  state.clearSelection;
export const selectSetVendors = (state: VendorSelectionState) =>
  state.setVendors;
