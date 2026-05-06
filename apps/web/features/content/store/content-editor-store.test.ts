import { describe, it, expect, beforeEach } from "vitest";
import type { BlockNode } from "@repo/shared";
import {
  createContentEditorStore,
  type ContentEditorStore,
} from "./content-editor-store";

function block(id: string, text = "T"): BlockNode {
  return {
    id,
    kind: "heading" as BlockNode["kind"],
    props: { text, level: 2 } as BlockNode["props"],
  };
}

describe("content-editor-store", () => {
  let store: ContentEditorStore;

  beforeEach(() => {
    store = createContentEditorStore();
  });

  describe("load", () => {
    it("replaces blocks and clears history", () => {
      store.getState().load([block("a"), block("b")]);
      expect(store.getState().present.blocks).toHaveLength(2);
      expect(store.getState().past).toHaveLength(0);
      expect(store.getState().future).toHaveLength(0);
      expect(store.getState().dirty).toBe(false);
    });

    it("clears selectedId", () => {
      store.getState().load([block("a")]);
      store.getState().setSelected("a");
      store.getState().load([block("b")]);
      expect(store.getState().selectedId).toBe(null);
    });
  });

  describe("addBlock", () => {
    it("appends to the end by default", () => {
      store.getState().load([block("a")]);
      store.getState().addBlock(block("b"));
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "b",
      ]);
    });

    it("inserts at the given index", () => {
      store.getState().load([block("a"), block("c")]);
      store.getState().addBlock(block("b"), 1);
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("selects the new block", () => {
      store.getState().load([]);
      store.getState().addBlock(block("a"));
      expect(store.getState().selectedId).toBe("a");
    });

    it("marks dirty + pushes onto past", () => {
      store.getState().load([block("a")]);
      store.getState().addBlock(block("b"));
      expect(store.getState().dirty).toBe(true);
      expect(store.getState().past).toHaveLength(1);
    });
  });

  describe("removeBlock", () => {
    it("removes by id and clears selection if it was selected", () => {
      store.getState().load([block("a"), block("b")]);
      store.getState().setSelected("a");
      store.getState().removeBlock("a");
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual(["b"]);
      expect(store.getState().selectedId).toBe(null);
    });

    it("preserves selection if a different block is removed", () => {
      store.getState().load([block("a"), block("b")]);
      store.getState().setSelected("a");
      store.getState().removeBlock("b");
      expect(store.getState().selectedId).toBe("a");
    });

    it("no-ops on unknown id", () => {
      store.getState().load([block("a")]);
      const before = store.getState().present.blocks;
      store.getState().removeBlock("x");
      expect(store.getState().present.blocks).toBe(before);
      expect(store.getState().past).toHaveLength(0);
    });
  });

  describe("moveBlock / moveBlockTo", () => {
    it("moves +1 / -1 within bounds", () => {
      store.getState().load([block("a"), block("b"), block("c")]);
      store.getState().moveBlock("b", 1);
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "c",
        "b",
      ]);
      store.getState().moveBlock("b", -1);
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("clamps at edges", () => {
      store.getState().load([block("a"), block("b")]);
      const before = store.getState().present.blocks;
      store.getState().moveBlock("a", -1);
      expect(store.getState().present.blocks).toBe(before);
    });

    it("moveBlockTo clamps + repositions", () => {
      store.getState().load([block("a"), block("b"), block("c")]);
      store.getState().moveBlockTo("a", 99);
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "b",
        "c",
        "a",
      ]);
    });
  });

  describe("duplicateBlock", () => {
    it("inserts a copy with a new id immediately after the source", () => {
      store.getState().load([block("a"), block("c")]);
      store.getState().duplicateBlock("a");
      const ids = store.getState().present.blocks.map((b) => b.id);
      expect(ids).toHaveLength(3);
      expect(ids[0]).toBe("a");
      expect(ids[2]).toBe("c");
      expect(ids[1]).not.toBe("a");
      expect(store.getState().selectedId).toBe(ids[1]);
    });
  });

  describe("updateBlockProps", () => {
    it("merges into existing props", () => {
      store.getState().load([block("a", "Hello")]);
      store.getState().updateBlockProps("a", { text: "World" });
      const props = store.getState().present.blocks[0]!.props as Record<
        string,
        unknown
      >;
      expect(props.text).toBe("World");
      expect(props.level).toBe(2);
    });
  });

  describe("undo / redo", () => {
    it("undoes the last mutation", () => {
      store.getState().load([block("a")]);
      store.getState().addBlock(block("b"));
      expect(store.getState().present.blocks).toHaveLength(2);
      store.getState().undo();
      expect(store.getState().present.blocks).toHaveLength(1);
      expect(store.getState().future).toHaveLength(1);
    });

    it("redoes after undo", () => {
      store.getState().load([block("a")]);
      store.getState().addBlock(block("b"));
      store.getState().undo();
      store.getState().redo();
      expect(store.getState().present.blocks.map((b) => b.id)).toEqual([
        "a",
        "b",
      ]);
    });

    it("a fresh mutation clears future", () => {
      store.getState().load([block("a")]);
      store.getState().addBlock(block("b"));
      store.getState().undo();
      store.getState().addBlock(block("c"));
      expect(store.getState().future).toHaveLength(0);
    });

    it("canUndo / canRedo flags track the stacks", () => {
      store.getState().load([block("a")]);
      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(false);
      store.getState().addBlock(block("b"));
      expect(store.getState().canUndo()).toBe(true);
      store.getState().undo();
      expect(store.getState().canRedo()).toBe(true);
    });
  });
});
