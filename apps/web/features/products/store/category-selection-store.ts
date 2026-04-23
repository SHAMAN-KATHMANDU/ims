"use client";

import { create } from "zustand";

// ============================================
// Types
// ============================================

interface CategorySelectionState {
  selectedCategoryIds: Set<string>;
  addCategory: (categoryId: string) => void;
  removeCategory: (categoryId: string) => void;
  toggleCategory: (categoryId: string) => void;
  setCategories: (categoryIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (categoryId: string) => boolean;
}

// ============================================
// Store
// ============================================

export const useCategorySelectionStore = create<CategorySelectionState>()(
  (set, get) => ({
    selectedCategoryIds: new Set(),

    addCategory: (categoryId) => {
      set((state) => {
        const newSet = new Set(state.selectedCategoryIds);
        newSet.add(categoryId);
        return { selectedCategoryIds: newSet };
      });
    },

    removeCategory: (categoryId) => {
      set((state) => {
        const newSet = new Set(state.selectedCategoryIds);
        newSet.delete(categoryId);
        return { selectedCategoryIds: newSet };
      });
    },

    toggleCategory: (categoryId) => {
      set((state) => {
        const newSet = new Set(state.selectedCategoryIds);
        if (newSet.has(categoryId)) {
          newSet.delete(categoryId);
        } else {
          newSet.add(categoryId);
        }
        return { selectedCategoryIds: newSet };
      });
    },

    setCategories: (categoryIds) => {
      set({ selectedCategoryIds: new Set(categoryIds) });
    },

    clearSelection: () => {
      set({ selectedCategoryIds: new Set() });
    },

    isSelected: (categoryId) => {
      return get().selectedCategoryIds.has(categoryId);
    },
  }),
);

// ============================================
// Selectors
// ============================================

export const selectSelectedCategoryIds = (state: CategorySelectionState) =>
  state.selectedCategoryIds;
export const selectClearSelection = (state: CategorySelectionState) =>
  state.clearSelection;
export const selectSetCategories = (state: CategorySelectionState) =>
  state.setCategories;
export const selectAddCategory = (state: CategorySelectionState) =>
  state.addCategory;
export const selectRemoveCategory = (state: CategorySelectionState) =>
  state.removeCategory;
export const selectToggleCategory = (state: CategorySelectionState) =>
  state.toggleCategory;
export const selectIsCategorySelected = (state: CategorySelectionState) =>
  state.isSelected;
