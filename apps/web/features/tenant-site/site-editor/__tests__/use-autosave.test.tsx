/**
 * useAutosave: navigating away inside the debounce window must flush the
 * pending draft instead of silently dropping the last edit.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { useAutosave } from "../hooks/useAutosave";

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock("../hooks/useSiteLayoutMutations", () => ({
  useSaveLayoutDraft: () => ({ mutateAsync }),
}));

function heading(id: string): BlockNode {
  return { id, kind: "heading", props: { text: "Hi" } } as BlockNode;
}

describe("useAutosave", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    useEditorStore.getState().load([]);
  });

  it("flushes a pending dirty save on unmount", async () => {
    const { unmount } = renderHook(() => useAutosave("home", null));

    // Make an edit; the debounced save is now pending (2s away).
    useEditorStore.getState().addBlock(heading("h1"));
    expect(useEditorStore.getState().dirty).toBe(true);

    // Navigate away before the debounce fires.
    unmount();

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const savedBlocks = mutateAsync.mock.calls[0]?.[0] as BlockNode[];
    expect(savedBlocks).toHaveLength(1);
    expect(savedBlocks[0]?.id).toBe("h1");

    await waitFor(() => {
      expect(useEditorStore.getState().dirty).toBe(false);
      expect(useEditorStore.getState().lastSaveTime).not.toBeNull();
    });
  });

  it("does not save on unmount when nothing is dirty", () => {
    const { unmount } = renderHook(() => useAutosave("home", null));
    unmount();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("saves after the debounce and records lastSaveTime", async () => {
    vi.useFakeTimers();
    try {
      const { unmount } = renderHook(() => useAutosave("home", null));
      useEditorStore.getState().addBlock(heading("h2"));

      await vi.advanceTimersByTimeAsync(2100);
      expect(mutateAsync).toHaveBeenCalledTimes(1);

      await vi.runAllTimersAsync();
      expect(useEditorStore.getState().dirty).toBe(false);
      expect(useEditorStore.getState().lastSaveTime).not.toBeNull();
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
