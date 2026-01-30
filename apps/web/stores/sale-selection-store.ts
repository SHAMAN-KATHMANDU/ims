"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface SaleSelectionState {
  // State
  selectedSaleIds: Set<string>;

  // Actions
  addSale: (saleId: string) => void;
  removeSale: (saleId: string) => void;
  toggleSale: (saleId: string) => void;
  setSales: (saleIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (saleId: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useSaleSelectionStore = create<SaleSelectionState>()(
  (set, get) => ({
    // Initial state
    selectedSaleIds: new Set(),

    // Actions
    addSale: (saleId) => {
      set((state) => {
        const newSet = new Set(state.selectedSaleIds);
        newSet.add(saleId);
        return { selectedSaleIds: newSet };
      });
    },

    removeSale: (saleId) => {
      set((state) => {
        const newSet = new Set(state.selectedSaleIds);
        newSet.delete(saleId);
        return { selectedSaleIds: newSet };
      });
    },

    toggleSale: (saleId) => {
      set((state) => {
        const newSet = new Set(state.selectedSaleIds);
        if (newSet.has(saleId)) {
          newSet.delete(saleId);
        } else {
          newSet.add(saleId);
        }
        return { selectedSaleIds: newSet };
      });
    },

    setSales: (saleIds) => {
      set({ selectedSaleIds: new Set(saleIds) });
    },

    clearSelection: () => {
      set({ selectedSaleIds: new Set() });
    },

    isSelected: (saleId) => {
      return get().selectedSaleIds.has(saleId);
    },
  }),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const selectSelectedSaleIds = (state: SaleSelectionState) =>
  state.selectedSaleIds;
export const selectSaleSelectionCount = (state: SaleSelectionState) =>
  state.selectedSaleIds.size;
export const selectIsSaleSelected = (state: SaleSelectionState) =>
  state.isSelected;
export const selectClearSaleSelection = (state: SaleSelectionState) =>
  state.clearSelection;
