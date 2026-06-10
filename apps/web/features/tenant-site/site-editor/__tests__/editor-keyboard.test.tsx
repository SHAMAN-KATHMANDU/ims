/**
 * useEditorKeyboard: editor shortcuts must NOT fire while focus is in a
 * text-entry surface — Backspace while typing used to delete the whole
 * selected block.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { useEditorKeyboard } from "../keyboard/useEditorKeyboard";

function heading(id: string): BlockNode {
  return { id, kind: "heading", props: { text: "Hi" } } as BlockNode;
}

function pressBackspace(target: EventTarget) {
  const event = new KeyboardEvent("keydown", {
    key: "Backspace",
    bubbles: true,
  });
  target.dispatchEvent(event);
}

describe("useEditorKeyboard editable-target guard", () => {
  beforeEach(() => {
    useEditorStore.getState().load([heading("h1")]);
    useEditorStore.getState().setSelected("h1");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("Backspace on the canvas background deletes the selected block", () => {
    const { unmount } = renderHook(() => useEditorKeyboard({ enabled: true }));
    pressBackspace(document.body);
    expect(useEditorStore.getState().present.blocks).toHaveLength(0);
    unmount();
  });

  it("Backspace inside an <input> does NOT delete the selected block", () => {
    const { unmount } = renderHook(() => useEditorKeyboard({ enabled: true }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    pressBackspace(input);
    expect(useEditorStore.getState().present.blocks).toHaveLength(1);
    unmount();
  });

  it("Backspace inside a contentEditable does NOT delete the selected block", () => {
    const { unmount } = renderHook(() => useEditorKeyboard({ enabled: true }));
    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);
    // jsdom doesn't compute isContentEditable from the attribute alone in all
    // versions — force the property the guard reads.
    if (!div.isContentEditable) {
      Object.defineProperty(div, "isContentEditable", { value: true });
    }
    pressBackspace(div);
    expect(useEditorStore.getState().present.blocks).toHaveLength(1);
    unmount();
  });

  it("Backspace inside a <textarea> does NOT delete the selected block", () => {
    const { unmount } = renderHook(() => useEditorKeyboard({ enabled: true }));
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    pressBackspace(textarea);
    expect(useEditorStore.getState().present.blocks).toHaveLength(1);
    unmount();
  });
});
