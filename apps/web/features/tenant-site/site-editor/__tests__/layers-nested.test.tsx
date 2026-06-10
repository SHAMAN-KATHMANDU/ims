/**
 * Layers panel must list NESTED blocks — the canvas only wraps root blocks,
 * so the layers panel is the selection path for children.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { LayersPanel } from "../layers/LayersPanel";

const tree: BlockNode[] = [
  {
    id: "sec-1",
    kind: "section",
    props: {},
    children: [
      { id: "head-1", kind: "heading", props: { text: "Inner heading" } },
      {
        id: "row-1",
        kind: "row",
        props: {},
        children: [
          { id: "img-1", kind: "image", props: {} },
          { id: "btn-1", kind: "button", props: { label: "Go" } },
        ],
      },
    ],
  },
] as BlockNode[];

describe("LayersPanel nested blocks", () => {
  beforeEach(() => {
    useEditorStore.getState().load(tree);
  });

  it("renders rows for nested children at every depth", () => {
    render(<LayersPanel />);
    // 1 root + 2 children + 2 grandchildren (labels are composite,
    // e.g. "H2 · Inner heading", "Image · <alt>", "Button · <label>")
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText(/Inner heading/)).toBeInTheDocument();
    expect(screen.getByText("Row")).toBeInTheDocument();
    expect(screen.getByText(/^Image/)).toBeInTheDocument();
    expect(screen.getByText(/Button · Go/)).toBeInTheDocument();
  });

  it("clicking a grandchild row selects it", () => {
    render(<LayersPanel />);
    fireEvent.click(screen.getByText(/^Image/));
    expect(useEditorStore.getState().selectedId).toBe("img-1");
  });

  it("deleting a nested row removes only that block", () => {
    render(<LayersPanel />);
    const buttonRow = screen
      .getByText(/Button · Go/)
      .closest('[role="button"]');
    const deleteBtn = buttonRow?.querySelector('button[title="Delete block"]');
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn!);

    const blocks = useEditorStore.getState().present.blocks;
    const row = blocks[0]?.children?.[1];
    expect(row?.children?.map((c) => c.id)).toEqual(["img-1"]);
    // The rest of the tree is intact.
    expect(blocks[0]?.children?.[0]?.id).toBe("head-1");
  });

  it("nested rows are indented by depth", () => {
    render(<LayersPanel />);
    const root = screen.getByText("Section").closest('[role="button"]');
    const grandchild = screen.getByText(/^Image/).closest('[role="button"]');
    const rootPad = parseInt(
      (root as HTMLElement).style.paddingLeft || "0",
      10,
    );
    const childPad = parseInt(
      (grandchild as HTMLElement).style.paddingLeft || "0",
      10,
    );
    expect(childPad).toBeGreaterThan(rootPad);
  });
});
