/**
 * SlashMenu: filter + insert behavior. The component existed but was never
 * mounted; these tests pin down the contract now that Canvas renders it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { SlashMenu } from "../canvas/SlashMenu";

function heading(id: string): BlockNode {
  return { id, kind: "heading", props: { text: "Hi", level: 2 } } as BlockNode;
}

describe("SlashMenu", () => {
  beforeEach(() => {
    useEditorStore.getState().load([heading("anchor-1")]);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <SlashMenu isOpen={false} onClose={() => {}} anchorId="anchor-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("filters entries by query", () => {
    render(<SlashMenu isOpen onClose={() => {}} anchorId="anchor-1" />);
    fireEvent.change(screen.getByPlaceholderText("Type to filter..."), {
      target: { value: "divider" },
    });
    expect(screen.getByText("Divider")).toBeInTheDocument();
    expect(screen.queryByText("Video")).not.toBeInTheDocument();
  });

  it("inserts the clicked entry after the anchor block and closes", () => {
    const onClose = vi.fn();
    render(<SlashMenu isOpen onClose={onClose} anchorId="anchor-1" />);
    fireEvent.change(screen.getByPlaceholderText("Type to filter..."), {
      target: { value: "divider" },
    });
    fireEvent.click(screen.getByText("Divider"));

    const blocks = useEditorStore.getState().present.blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.id).toBe("anchor-1");
    expect(blocks[1]?.kind).toBe("divider");
    expect(onClose).toHaveBeenCalled();
  });

  it("inserts a preset variant's own defaults", () => {
    render(<SlashMenu isOpen onClose={() => {}} anchorId="anchor-1" />);
    fireEvent.change(screen.getByPlaceholderText("Type to filter..."), {
      target: { value: "New Arrivals" },
    });
    fireEvent.click(screen.getByText("New Arrivals"));

    const blocks = useEditorStore.getState().present.blocks;
    expect(blocks[1]?.kind).toBe("product-grid");
    expect((blocks[1]?.props as { source?: string }).source).toBe("newest");
  });

  it("Enter on an empty filtered list does not crash", () => {
    render(<SlashMenu isOpen onClose={() => {}} anchorId="anchor-1" />);
    fireEvent.change(screen.getByPlaceholderText("Type to filter..."), {
      target: { value: "zzz-no-match" },
    });
    // List is empty → component unmounts its list; Enter must not throw.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(useEditorStore.getState().present.blocks).toHaveLength(1);
  });
});
