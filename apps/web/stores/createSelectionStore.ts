"use client";

/**
 * Single point of change for entity selection store behavior (Set of IDs, add/remove/toggle/set/clear).
 * Sale and member selection stores are built from this; change both by editing selectionStoreImpl.
 */

export interface SelectionStoreImpl {
  selectedIds: Set<string>;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  set: (ids: Set<string>) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;
type GetState<T> = () => T;

/**
 * Shared implementation for selection stores. Returns state + actions with generic keys.
 * idsKey: the state key the store uses for the Set (e.g. "selectedSaleIds"); impl will read/write that key.
 */
export function selectionStoreImpl(
  set: SetState<Record<string, unknown>>,
  get: GetState<Record<string, unknown>>,
  idsKey: string,
): SelectionStoreImpl {
  const getIds = () => (get()[idsKey] as Set<string> | undefined) ?? new Set();
  return {
    selectedIds: new Set(),
    add: (id) => {
      set((state) => {
        const current = (state[idsKey] as Set<string> | undefined) ?? new Set();
        const next = new Set(current);
        next.add(id);
        return { [idsKey]: next };
      });
    },
    remove: (id) => {
      set((state) => {
        const current = (state[idsKey] as Set<string> | undefined) ?? new Set();
        const next = new Set(current);
        next.delete(id);
        return { [idsKey]: next };
      });
    },
    toggle: (id) => {
      set((state) => {
        const current = (state[idsKey] as Set<string> | undefined) ?? new Set();
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { [idsKey]: next };
      });
    },
    set: (ids) => set({ [idsKey]: new Set(ids) }),
    clearSelection: () => set({ [idsKey]: new Set() }),
    isSelected: (id) => getIds().has(id),
  };
}
