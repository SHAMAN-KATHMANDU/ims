"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface ProductSelectionState {
  // State
  selectedProductIds: Set<string>;

  // Actions
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  toggleProduct: (productId: string) => void;
  setProducts: (productIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (productId: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useProductSelectionStore = create<ProductSelectionState>()(
  (set, get) => ({
    // Initial state
    selectedProductIds: new Set(),

    // Actions
    addProduct: (productId) => {
      set((state) => {
        const newSet = new Set(state.selectedProductIds);
        newSet.add(productId);
        return { selectedProductIds: newSet };
      });
    },

    removeProduct: (productId) => {
      set((state) => {
        const newSet = new Set(state.selectedProductIds);
        newSet.delete(productId);
        return { selectedProductIds: newSet };
      });
    },

    toggleProduct: (productId) => {
      set((state) => {
        const newSet = new Set(state.selectedProductIds);
        if (newSet.has(productId)) {
          newSet.delete(productId);
        } else {
          newSet.add(productId);
        }
        return { selectedProductIds: newSet };
      });
    },

    setProducts: (productIds) => {
      set({ selectedProductIds: new Set(productIds) });
    },

    clearSelection: () => {
      set({ selectedProductIds: new Set() });
    },

    isSelected: (productId) => {
      return get().selectedProductIds.has(productId);
    },
  }),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const selectSelectedProductIds = (state: ProductSelectionState) =>
  state.selectedProductIds;
export const selectSelectionCount = (state: ProductSelectionState) =>
  state.selectedProductIds.size;
export const selectIsSelected = (state: ProductSelectionState) =>
  state.isSelected;
export const selectClearSelection = (state: ProductSelectionState) =>
  state.clearSelection;
