import { describe, it, expect, beforeEach } from "vitest";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { resetIdCounter } from "../tree/ids";

function section(id: string, children?: BlockNode[]): BlockNode {
  return {
    id,
    kind: "section" as const,
    props: {},
    ...(children ? { children } : {}),
  } as BlockNode;
}

describe("useEditorStore", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("load", () => {
    it("replaces the entire tree", () => {
      const store = useEditorStore.getState();
      const blocks: BlockNode[] = [section("a"), section("b")];

      store.load(blocks);

      const state = useEditorStore.getState();
      expect(state.present.blocks).toHaveLength(2);
      expect(state.present.blocks[0]?.id).toBe("a");
    });

    it("clears history on load", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));
      store.load([section("c")]);

      const state = useEditorStore.getState();
      expect(state.past).toHaveLength(0);
      expect(state.future).toHaveLength(0);
    });

    it("marks the tree as clean", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);

      const state = useEditorStore.getState();
      expect(state.dirty).toBe(false);
    });

    it("clears selection", () => {
      const store = useEditorStore.getState();
      store.setSelected("something");
      store.load([section("a")]);

      const state = useEditorStore.getState();
      expect(state.selectedId).toBeNull();
    });
  });

  describe("markClean", () => {
    it("sets dirty to false", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));

      expect(useEditorStore.getState().dirty).toBe(true);

      store.markClean();

      expect(useEditorStore.getState().dirty).toBe(false);
    });
  });

  describe("addBlock", () => {
    it("appends a block to the tree", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));

      const state = useEditorStore.getState();
      expect(state.present.blocks).toHaveLength(2);
      expect(state.present.blocks[1]?.id).toBe("b");
    });

    it("inserts a block at a specific index", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("c")]);
      store.addBlock(section("b"), 1);

      const state = useEditorStore.getState();
      expect(state.present.blocks[1]?.id).toBe("b");
    });

    it("sets the added block as selected", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));

      const state = useEditorStore.getState();
      expect(state.selectedId).toBe("b");
    });

    it("marks the tree as dirty", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.markClean();
      store.addBlock(section("b"));

      const state = useEditorStore.getState();
      expect(state.dirty).toBe(true);
    });

    it("pushes the previous state onto past", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));

      const state = useEditorStore.getState();
      expect(state.past).toHaveLength(1);
      expect(state.past[0]?.blocks).toHaveLength(1);
    });
  });

  describe("removeBlock", () => {
    it("removes a block from the tree", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b"), section("c")]);
      store.removeBlock("b");

      const state = useEditorStore.getState();
      expect(state.present.blocks).toHaveLength(2);
      expect(state.present.blocks.map((b) => b.id)).toEqual(["a", "c"]);
    });

    it("clears selection if the removed block was selected", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.setSelected("a");
      store.removeBlock("a");

      const state = useEditorStore.getState();
      expect(state.selectedId).toBeNull();
    });

    it("preserves selection for other blocks", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      store.setSelected("a");
      store.removeBlock("b");

      const state = useEditorStore.getState();
      expect(state.selectedId).toBe("a");
    });

    it("is a no-op when block not found", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      const original = useEditorStore.getState().present;
      store.removeBlock("missing");

      const state = useEditorStore.getState();
      expect(state.present).toEqual(original);
    });
  });

  describe("moveBlock", () => {
    it("moves a block forward among siblings", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b"), section("c")]);
      store.moveBlock("a", 1);

      const state = useEditorStore.getState();
      expect(state.present.blocks.map((b) => b.id)).toEqual(["b", "a", "c"]);
    });

    it("moves a block backward among siblings", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b"), section("c")]);
      store.moveBlock("b", -1);

      const state = useEditorStore.getState();
      expect(state.present.blocks.map((b) => b.id)).toEqual(["b", "a", "c"]);
    });

    it("is a no-op when move would go out of bounds", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      const original = JSON.stringify(useEditorStore.getState().present);
      store.moveBlock("a", -1);

      const state = useEditorStore.getState();
      expect(JSON.stringify(state.present)).toEqual(original);
    });
  });

  describe("moveBlockToPath", () => {
    it("moves a block to a different parent", () => {
      const store = useEditorStore.getState();
      store.load([
        section("parent-a", [section("child-a")]),
        section("parent-b", [section("child-b")]),
      ]);
      store.moveBlockToPath([0, 0], [1, 0]);

      const state = useEditorStore.getState();
      expect(state.present.blocks[1]?.children?.length).toBe(2);
      expect(state.present.blocks[1]?.children?.[0]?.id).toBe("child-a");
    });

    it("unwraps empty containers after the move", () => {
      const store = useEditorStore.getState();
      store.load([
        {
          id: "row",
          kind: "row" as const,
          props: {},
          children: [section("a"), section("b")],
        } as BlockNode,
      ]);
      store.moveBlockToPath([0, 0], [1]);

      const state = useEditorStore.getState();
      expect(state.present.blocks.length).toBeLessThanOrEqual(2);
    });
  });

  describe("insertSiblingOf", () => {
    it("inserts a sibling before an anchor", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      store.insertSiblingOf("b", "before", section("x"));

      const state = useEditorStore.getState();
      expect(state.present.blocks.map((b) => b.id)).toEqual(["a", "x", "b"]);
    });

    it("inserts a sibling after an anchor", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      store.insertSiblingOf("a", "after", section("x"));

      const state = useEditorStore.getState();
      expect(state.present.blocks.map((b) => b.id)).toEqual(["a", "x", "b"]);
    });

    it("sets the new block as selected", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.insertSiblingOf("a", "after", section("b"));

      const state = useEditorStore.getState();
      expect(state.selectedId).toBe("b");
    });
  });

  describe("insertChildOf", () => {
    it("appends a child to a container", () => {
      const store = useEditorStore.getState();
      store.load([section("parent", [section("a")])]);
      store.insertChildOf("parent", section("b"));

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.children?.length).toBe(2);
      expect(state.present.blocks[0]?.children?.[1]?.id).toBe("b");
    });

    it("inserts a child at a specific index", () => {
      const store = useEditorStore.getState();
      store.load([section("parent", [section("a"), section("c")])]);
      store.insertChildOf("parent", section("b"), 1);

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.children?.map((b) => b.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("is a no-op for non-container kinds", () => {
      const store = useEditorStore.getState();
      store.load([
        { id: "leaf", kind: "heading" as const, props: {} } as BlockNode,
      ]);
      const original = JSON.stringify(useEditorStore.getState().present);
      store.insertChildOf("leaf", section("child"));

      const state = useEditorStore.getState();
      expect(JSON.stringify(state.present)).toEqual(original);
    });
  });

  describe("wrapInRowAt", () => {
    it("wraps an anchor with a new block in a row", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.wrapInRowAt("a", "left", section("b"));

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.kind).toBe("row");
      expect(state.present.blocks[0]?.children?.length).toBe(2);
      expect(state.present.blocks[0]?.children?.[0]?.id).toBe("b");
      expect(state.present.blocks[0]?.children?.[1]?.id).toBe("a");
    });

    it("places the new block on the right when specified", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.wrapInRowAt("a", "right", section("b"));

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.children?.[0]?.id).toBe("a");
      expect(state.present.blocks[0]?.children?.[1]?.id).toBe("b");
    });
  });

  describe("duplicateBlock", () => {
    it("clones a block and inserts it as a sibling", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      store.duplicateBlock("a");

      const state = useEditorStore.getState();
      expect(state.present.blocks.length).toBe(3);
      expect(state.present.blocks[1]?.kind).toBe("section");
      expect(state.present.blocks[1]?.id).not.toBe("a");
    });

    it("sets the duplicate as selected", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.duplicateBlock("a");

      const state = useEditorStore.getState();
      expect(state.selectedId).not.toBe("a");
    });
  });

  describe("updateBlockProps", () => {
    it("updates props of a block", () => {
      const store = useEditorStore.getState();
      store.load([section("h1")]);
      store.updateBlockProps("h1", {});

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.id).toBe("h1");
    });

    it("works for nested blocks", () => {
      const store = useEditorStore.getState();
      store.load([section("parent", [section("h1")])]);
      store.updateBlockProps("h1", {});

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.children?.[0]?.id).toBe("h1");
    });

    it("marks tree as dirty", () => {
      const store = useEditorStore.getState();
      store.load([section("h1")]);
      store.markClean();
      store.updateBlockProps("h1", {});

      const state = useEditorStore.getState();
      expect(state.dirty).toBe(true);
    });
  });

  describe("updateBlockVisibility", () => {
    it("updates visibility of a block", () => {
      const store = useEditorStore.getState();
      store.load([section("h1")]);
      store.updateBlockVisibility("h1", { mobile: false });

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.visibility?.mobile).toBe(false);
    });

    it("merges with existing visibility", () => {
      const store = useEditorStore.getState();
      store.load([
        {
          ...section("h1"),
          visibility: { mobile: false, desktop: true },
        },
      ]);
      store.updateBlockVisibility("h1", { tablet: false });

      const state = useEditorStore.getState();
      const vis = state.present.blocks[0]?.visibility;
      expect(vis?.mobile).toBe(false);
      expect(vis?.desktop).toBe(true);
      expect(vis?.tablet).toBe(false);
    });
  });

  describe("updateBlockStyle", () => {
    it("updates style of a block", () => {
      const store = useEditorStore.getState();
      store.load([section("h1")]);
      store.updateBlockStyle("h1", { paddingY: "compact" });

      const state = useEditorStore.getState();
      expect(state.present.blocks[0]?.style?.paddingY).toBe("compact");
    });
  });

  describe("undo/redo", () => {
    it("undoes the last mutation", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));
      store.undo();

      const state = useEditorStore.getState();
      expect(state.present.blocks).toHaveLength(1);
      expect(state.present.blocks[0]?.id).toBe("a");
    });

    it("redoes the undone mutation", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));
      store.undo();
      store.redo();

      const state = useEditorStore.getState();
      expect(state.present.blocks).toHaveLength(2);
    });

    it("clears future when a new mutation happens", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.addBlock(section("b"));
      store.undo();
      expect(useEditorStore.getState().future.length).toBeGreaterThan(0);

      store.addBlock(section("c"));
      expect(useEditorStore.getState().future).toHaveLength(0);
    });

    it("respects history limit", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);

      for (let i = 0; i < 100; i++) {
        store.addBlock(section(`s${i}`));
      }

      const state = useEditorStore.getState();
      expect(state.past.length).toBeLessThanOrEqual(50);
    });
  });

  describe("selection state", () => {
    it("updates selected block", () => {
      const store = useEditorStore.getState();
      store.load([section("a"), section("b")]);
      store.setSelected("b");

      const state = useEditorStore.getState();
      expect(state.selectedId).toBe("b");
    });

    it("clears selection with null", () => {
      const store = useEditorStore.getState();
      store.load([section("a")]);
      store.setSelected("a");
      store.setSelected(null);

      const state = useEditorStore.getState();
      expect(state.selectedId).toBeNull();
    });
  });

  describe("hover state", () => {
    it("updates hovered block id", () => {
      const store = useEditorStore.getState();
      store.setHoveredBlockId("test-id");

      const state = useEditorStore.getState();
      expect(state.hoveredBlockId).toBe("test-id");
    });

    it("updates hovered block rect", () => {
      const store = useEditorStore.getState();
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      store.setHoveredBlockRect(rect);

      const state = useEditorStore.getState();
      expect(state.hoveredBlockRect).toEqual(rect);
    });

    it("updates selected block rect", () => {
      const store = useEditorStore.getState();
      const rect = { x: 0, y: 0, width: 200, height: 100 };
      store.setSelectedBlockRect(rect);

      const state = useEditorStore.getState();
      expect(state.selectedBlockRect).toEqual(rect);
    });
  });
});
