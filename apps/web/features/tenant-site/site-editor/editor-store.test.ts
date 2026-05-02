import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editor-store";
import type { BlockNode } from "@repo/shared";

function makeBlock(id: string, kind = "HeroBlock"): BlockNode {
  return {
    id,
    kind: kind as BlockNode["kind"],
    props: {} as BlockNode["props"],
  };
}

function getStore() {
  return useEditorStore.getState();
}

beforeEach(() => {
  useEditorStore.getState().load([]);
});

describe("editor-store", () => {
  // -------------------------------------------------------------------------
  describe("load", () => {
    it("replaces present blocks and resets history + dirty flag", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));
      store.load([makeBlock("b"), makeBlock("c")]);

      const s = getStore();
      expect(s.present.blocks).toHaveLength(2);
      expect(s.present.blocks[0]!.id).toBe("b");
      expect(s.past).toHaveLength(0);
      expect(s.future).toHaveLength(0);
      expect(s.dirty).toBe(false);
    });

    it("clears selectedId", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.setSelected("a");
      store.load([]);

      expect(getStore().selectedId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("markClean", () => {
    it("sets dirty to false without altering blocks", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));
      expect(getStore().dirty).toBe(true);

      store.markClean();

      expect(getStore().dirty).toBe(false);
      expect(getStore().present.blocks).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("addBlock", () => {
    it("appends a block when no atIndex given and sets selectedId", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      store.addBlock(makeBlock("c"));

      const s = getStore();
      expect(s.present.blocks.map((b) => b.id)).toEqual(["a", "b", "c"]);
      expect(s.selectedId).toBe("c");
    });

    it("inserts at the given index", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("c")]);
      store.addBlock(makeBlock("b"), 1);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("inserts at index 0 (prepend)", () => {
      const store = getStore();
      store.load([makeBlock("b")]);
      store.addBlock(makeBlock("a"), 0);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual(["a", "b"]);
    });

    it("marks dirty and pushes to past", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));

      const s = getStore();
      expect(s.dirty).toBe(true);
      expect(s.past).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("removeBlock", () => {
    it("removes the block by id", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b"), makeBlock("c")]);
      store.removeBlock("b");

      expect(getStore().present.blocks.map((b) => b.id)).toEqual(["a", "c"]);
    });

    it("clears selectedId when the removed block was selected", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.setSelected("a");
      store.removeBlock("a");

      expect(getStore().selectedId).toBeNull();
    });

    it("does not change selectedId when a different block is removed", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      store.setSelected("a");
      store.removeBlock("b");

      expect(getStore().selectedId).toBe("a");
    });
  });

  // -------------------------------------------------------------------------
  describe("moveBlock", () => {
    it("moves a block down by +1", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b"), makeBlock("c")]);
      store.moveBlock("a", 1);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual([
        "b",
        "a",
        "c",
      ]);
    });

    it("moves a block up by -1", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b"), makeBlock("c")]);
      store.moveBlock("c", -1);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "c",
        "b",
      ]);
    });

    it("does nothing when moving the first block up", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      const before = getStore().present.blocks.map((b) => b.id);
      store.moveBlock("a", -1);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual(before);
    });

    it("does nothing when moving the last block down", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      const before = getStore().present.blocks.map((b) => b.id);
      store.moveBlock("b", 1);

      expect(getStore().present.blocks.map((b) => b.id)).toEqual(before);
    });
  });

  // -------------------------------------------------------------------------
  describe("updateBlockProps", () => {
    it("merges props onto the target block", () => {
      const store = getStore();
      store.load([
        { ...makeBlock("a"), props: { title: "old" } as BlockNode["props"] },
      ]);
      store.updateBlockProps("a", { title: "new" });

      const block = getStore().present.blocks[0]!;
      expect((block.props as Record<string, unknown>).title).toBe("new");
    });

    it("only updates the targeted block", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      store.updateBlockProps("a", { title: "changed" });

      const bBlock = getStore().present.blocks[1]!;
      expect((bBlock.props as Record<string, unknown>).title).toBeUndefined();
    });

    it("marks dirty", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.markClean();
      store.updateBlockProps("a", { title: "x" });

      expect(getStore().dirty).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("updateBlockStyle", () => {
    it("merges style overrides onto the target block", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.updateBlockStyle("a", { backgroundColor: "#fff" });

      const block = getStore().present.blocks[0]!;
      expect((block.style as Record<string, unknown>)?.backgroundColor).toBe(
        "#fff",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("updateBlockVisibility", () => {
    it("merges visibility overrides", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.updateBlockVisibility("a", { mobile: false });

      const block = getStore().present.blocks[0]!;
      expect(block.visibility?.mobile).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("duplicateBlock", () => {
    it("inserts a clone directly after the source", () => {
      const store = getStore();
      store.load([makeBlock("a"), makeBlock("b")]);
      store.duplicateBlock("a");

      const ids = getStore().present.blocks.map((b) => b.id);
      expect(ids[0]).toBe("a");
      expect(ids[1]).not.toBe("a");
      expect(ids[2]).toBe("b");
    });

    it("sets selectedId to the new clone", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.duplicateBlock("a");

      const ids = getStore().present.blocks.map((b) => b.id);
      expect(getStore().selectedId).toBe(ids[1]);
    });

    it("does nothing when id is not found", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.duplicateBlock("nonexistent");

      expect(getStore().present.blocks).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("undo / redo", () => {
    it("undo restores the previous state", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.addBlock(makeBlock("b"));
      expect(getStore().present.blocks).toHaveLength(2);

      store.undo();

      expect(getStore().present.blocks).toHaveLength(1);
    });

    it("redo re-applies the undone mutation", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.addBlock(makeBlock("b"));
      store.undo();
      store.redo();

      expect(getStore().present.blocks).toHaveLength(2);
    });

    it("undo when no history is a no-op", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.undo(); // past is empty after load

      expect(getStore().present.blocks).toHaveLength(1);
    });

    it("redo when no future is a no-op", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.redo();

      expect(getStore().present.blocks).toHaveLength(1);
    });

    it("adding a block after undo clears the redo stack", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.addBlock(makeBlock("b"));
      store.undo();
      store.addBlock(makeBlock("c"));

      expect(getStore().future).toHaveLength(0);
    });

    it("canUndo returns false on a clean load", () => {
      expect(getStore().canUndo()).toBe(false);
    });

    it("canUndo returns true after a mutation", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));
      expect(getStore().canUndo()).toBe(true);
    });

    it("canRedo returns true after undo", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));
      store.undo();
      expect(getStore().canRedo()).toBe(true);
    });

    it("undo sets dirty to true", () => {
      const store = getStore();
      store.addBlock(makeBlock("a"));
      store.markClean();
      store.undo();

      expect(getStore().dirty).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("cross-depth tree mutations", () => {
    function withSection(): BlockNode {
      return {
        id: "p",
        kind: "section" as BlockNode["kind"],
        props: {} as BlockNode["props"],
        children: [
          {
            id: "c1",
            kind: "image" as BlockNode["kind"],
            props: {} as BlockNode["props"],
          },
          {
            id: "c2",
            kind: "button" as BlockNode["kind"],
            props: {} as BlockNode["props"],
          },
        ],
      };
    }

    it("removeBlock removes a nested block", () => {
      const store = getStore();
      store.load([makeBlock("a"), withSection()]);
      store.removeBlock("c1");
      const blocks = getStore().present.blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[1]!.children?.map((n) => n.id)).toEqual(["c2"]);
    });

    it("moveBlock(±1) reorders within the same nested parent", () => {
      const store = getStore();
      store.load([withSection()]);
      store.moveBlock("c1", 1);
      const section = getStore().present.blocks[0]!;
      expect(section.children?.map((n) => n.id)).toEqual(["c2", "c1"]);
    });

    it("moveBlockToPath moves a block from root into a section", () => {
      const store = getStore();
      store.load([makeBlock("a"), withSection()]);
      // Move "a" into "p" as the first child.
      store.moveBlockToPath([0], [1, 0]);
      const blocks = getStore().present.blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.id).toBe("p");
      expect(blocks[0]!.children?.map((n) => n.id)).toEqual(["a", "c1", "c2"]);
    });

    it("moveBlockToPath out of a one-child row collapses the empty row", () => {
      const store = getStore();
      store.load([
        {
          id: "r",
          kind: "row" as BlockNode["kind"],
          props: {} as BlockNode["props"],
          children: [makeBlock("inner", "button")],
        },
      ]);
      // Move "inner" out to root slot 0; row left empty -> unwrapEmpty drops it.
      store.moveBlockToPath([0, 0], [1]);
      const blocks = getStore().present.blocks;
      expect(blocks.map((n) => n.id)).toEqual(["inner"]);
    });

    it("insertSiblingOf places a new block next to an anchor at any depth", () => {
      const store = getStore();
      store.load([withSection()]);
      const fresh = makeBlock("x", "heading");
      store.insertSiblingOf("c1", "after", fresh);
      const section = getStore().present.blocks[0]!;
      expect(section.children?.map((n) => n.id)).toEqual(["c1", "x", "c2"]);
      expect(getStore().selectedId).toBe("x");
    });

    it("insertChildOf no-ops when target is not a container", () => {
      const store = getStore();
      store.load([makeBlock("a")]);
      store.insertChildOf("a", makeBlock("x"));
      expect(getStore().present.blocks.map((n) => n.id)).toEqual(["a"]);
    });

    it("insertChildOf appends to a container's children", () => {
      const store = getStore();
      store.load([withSection()]);
      store.insertChildOf("p", makeBlock("x", "heading"));
      const section = getStore().present.blocks[0]!;
      expect(section.children?.map((n) => n.id)).toEqual(["c1", "c2", "x"]);
    });

    it("wrapInRowAt replaces the anchor with a row containing both", () => {
      const store = getStore();
      store.load([makeBlock("a", "heading"), makeBlock("b", "image")]);
      store.wrapInRowAt("a", "right", makeBlock("x", "button"));
      const blocks = getStore().present.blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[0]!.kind).toBe("row");
      expect(blocks[0]!.children?.map((n) => n.id)).toEqual(["a", "x"]);
      expect(blocks[1]!.id).toBe("b");
    });
  });
});
