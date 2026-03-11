"use client";

/**
 * Location selection store (multi-select for bulk actions). Built from createSelectionStore.
 */

import { create } from "zustand";
import { selectionStoreImpl } from "./createSelectionStore";

interface LocationSelectionState {
  selectedLocationIds: Set<string>;
  addLocation: (locationId: string) => void;
  removeLocation: (locationId: string) => void;
  toggleLocation: (locationId: string) => void;
  setLocations: (locationIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (locationId: string) => boolean;
}

export const useLocationSelectionStore = create<LocationSelectionState>()(
  (set, get) => {
    const impl = selectionStoreImpl(
      set as (
        p:
          | Record<string, unknown>
          | ((s: Record<string, unknown>) => Record<string, unknown>),
      ) => void,
      get as unknown as () => Record<string, unknown>,
      "selectedLocationIds",
    );
    return {
      selectedLocationIds: new Set(),
      addLocation: impl.add,
      removeLocation: impl.remove,
      toggleLocation: impl.toggle,
      setLocations: impl.set,
      clearSelection: impl.clearSelection,
      isSelected: impl.isSelected,
    };
  },
);

export const selectSelectedLocationIds = (state: LocationSelectionState) =>
  state.selectedLocationIds;
export const selectClearLocationSelection = (state: LocationSelectionState) =>
  state.clearSelection;
