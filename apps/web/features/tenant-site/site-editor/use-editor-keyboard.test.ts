import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { useEditorKeyboard } from "./use-editor-keyboard";
import { useEditorStore } from "./editor-store";

function makeBlock(id: string, kind = "heading"): BlockNode {
  return {
    id,
    kind: kind as BlockNode["kind"],
    props: {} as BlockNode["props"],
  };
}

function fire(key: string, init: Partial<KeyboardEventInit> = {}): void {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
}

beforeEach(() => {
  useEditorStore
    .getState()
    .load([makeBlock("a"), makeBlock("b"), makeBlock("c")]);
});

afterEach(() => {
  useEditorStore.getState().load([]);
});

describe("useEditorKeyboard", () => {
  it("does nothing when disabled", () => {
    renderHook(() => useEditorKeyboard(false));
    act(() => useEditorStore.getState().setSelected("b"));
    act(() => fire("ArrowDown", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("does nothing when nothing is selected", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => fire("ArrowDown", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("⌘↓ moves the selected block down one slot", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("b"));
    act(() => fire("ArrowDown", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("⌘↑ moves the selected block up one slot", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("b"));
    act(() => fire("ArrowUp", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("⌘↑ at the top is a no-op", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("a"));
    act(() => fire("ArrowUp", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("Backspace deletes the selected block and lands selection on previous sibling", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("b"));
    act(() => fire("Backspace"));
    const s = useEditorStore.getState();
    expect(s.present.blocks.map((n) => n.id)).toEqual(["a", "c"]);
    expect(s.selectedId).toBe("a");
  });

  it("Backspace on the first child lands selection on the next sibling", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("a"));
    act(() => fire("Backspace"));
    const s = useEditorStore.getState();
    expect(s.present.blocks.map((n) => n.id)).toEqual(["b", "c"]);
    expect(s.selectedId).toBe("b");
  });

  it("ArrowDown moves selection to next sibling without mutating tree", () => {
    renderHook(() => useEditorKeyboard(true));
    act(() => useEditorStore.getState().setSelected("a"));
    act(() => fire("ArrowDown"));
    const s = useEditorStore.getState();
    expect(s.selectedId).toBe("b");
    expect(s.present.blocks.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores keystrokes when an INPUT is focused", () => {
    renderHook(() => useEditorKeyboard(true));
    useEditorStore.getState().setSelected("b");
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "target", { value: input });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    document.body.removeChild(input);
  });

  it("removes the keydown listener on unmount", () => {
    const { unmount } = renderHook(() => useEditorKeyboard(true));
    useEditorStore.getState().setSelected("b");
    unmount();
    act(() => fire("ArrowDown", { metaKey: true }));
    expect(useEditorStore.getState().present.blocks.map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

// suppress unused-import warning when running headless
void vi;
