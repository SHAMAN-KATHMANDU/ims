/**
 * EditableTextBlock (BlockView's heading/rich-text path): the DOM is the
 * source of truth while focused; store updates flow outward on input; "/"
 * opens the slash menu and is stripped from the persisted text.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { MOCK_DATA_CONTEXT } from "@repo/blocks";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { BlockView } from "../canvas/BlockView";

const headingBlock = {
  id: "h1",
  kind: "heading",
  props: { text: "Hello", level: 2 },
} as BlockNode;

function renderHeading(block: BlockNode = headingBlock) {
  return render(<BlockView block={block} dataContext={MOCK_DATA_CONTEXT} />);
}

describe("BlockView editable text blocks", () => {
  beforeEach(() => {
    useEditorStore.getState().load([headingBlock]);
    useEditorStore.getState().setSlashMenuAnchor(null);
  });

  it("renders heading inside a contentEditable wrapper", () => {
    const { container } = renderHeading();
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable).not.toBeNull();
    expect(editable!.textContent).toContain("Hello");
  });

  it("typing pushes the new text into the store under `text`", () => {
    const { container } = renderHeading();
    const editable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    editable.innerText = "Hello world";
    fireEvent.input(editable);

    const stored = useEditorStore.getState().present.blocks[0];
    expect((stored?.props as { text?: string }).text).toBe("Hello world");
  });

  it("rich-text edits persist under `source` (strict schema)", () => {
    const rich = {
      id: "r1",
      kind: "rich-text",
      props: { source: "Hi" },
    } as BlockNode;
    useEditorStore.getState().load([rich]);
    const { container } = render(
      <BlockView block={rich} dataContext={MOCK_DATA_CONTEXT} />,
    );
    const editable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    editable.innerText = "Hi there";
    fireEvent.input(editable);

    const stored = useEditorStore.getState().present.blocks[0];
    expect((stored?.props as { source?: string }).source).toBe("Hi there");
    expect("text" in (stored?.props as object)).toBe(false);
  });

  it("a leading '/' opens the slash menu and is stripped from saved text", () => {
    const { container } = renderHeading();
    const editable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    editable.innerText = "/div";
    fireEvent.input(editable);

    const state = useEditorStore.getState();
    expect(state.slashMenuAnchor?.blockId).toBe("h1");
    expect((state.present.blocks[0]?.props as { text?: string }).text).toBe(
      "div",
    );
    expect(editable.innerText).toBe("div");
  });

  it("external prop changes re-render when the block is not focused", () => {
    const { container, rerender } = renderHeading();
    act(() => {
      useEditorStore
        .getState()
        .updateBlockProps("h1", { text: "From inspector" } as never);
    });
    const updated = useEditorStore.getState().present.blocks[0]!;
    rerender(<BlockView block={updated} dataContext={MOCK_DATA_CONTEXT} />);

    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable!.textContent).toContain("From inspector");
  });

  it("does not clobber the DOM while the block is focused (caret safety)", () => {
    const { container, rerender } = renderHeading();
    const editable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    // Focus the editable, then simulate the store changing mid-typing.
    editable.focus();
    Object.defineProperty(document, "activeElement", {
      value: editable,
      configurable: true,
    });
    editable.innerText = "user typed this";
    fireEvent.input(editable);

    const updated = useEditorStore.getState().present.blocks[0]!;
    rerender(<BlockView block={updated} dataContext={MOCK_DATA_CONTEXT} />);

    // The frozen render must not rewrite the text node under the caret.
    expect(editable.innerText).toBe("user typed this");
  });
});
