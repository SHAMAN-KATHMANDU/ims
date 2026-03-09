"use client";

/**
 * Sale selection store (multi-select for export). Built from createSelectionStore; single point of change there.
 */

import { create } from "zustand";
import { selectionStoreImpl } from "./createSelectionStore";

interface SaleSelectionState {
  selectedSaleIds: Set<string>;
  addSale: (saleId: string) => void;
  removeSale: (saleId: string) => void;
  toggleSale: (saleId: string) => void;
  setSales: (saleIds: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (saleId: string) => boolean;
}

export const useSaleSelectionStore = create<SaleSelectionState>()((
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
    "selectedSaleIds",
  );
  return {
    selectedSaleIds: new Set(),
    addSale: impl.add,
    removeSale: impl.remove,
    toggleSale: impl.toggle,
    setSales: impl.set,
    clearSelection: impl.clearSelection,
    isSelected: impl.isSelected,
  };
});

export const selectSelectedSaleIds = (state: SaleSelectionState) =>
  state.selectedSaleIds;
export const selectSaleSelectionCount = (state: SaleSelectionState) =>
  state.selectedSaleIds.size;
export const selectIsSaleSelected = (state: SaleSelectionState) =>
  state.isSelected;
export const selectClearSaleSelection = (state: SaleSelectionState) =>
  state.clearSelection;
