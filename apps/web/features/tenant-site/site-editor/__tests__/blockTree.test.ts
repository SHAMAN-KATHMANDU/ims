import { describe, it, expect, beforeEach } from "vitest";
import type { BlockNode } from "@repo/shared";
import {
  findPath,
  nodeAt,
  isAncestor,
  insertAt,
  removeAt,
  move,
  insertSibling,
  insertChild,
  wrapInRow,
  unwrapEmpty,
  duplicate,
} from "../tree/blockTree";
import { resetIdCounter } from "../tree/ids";

function node(id: string, children?: BlockNode[]): BlockNode {
  return {
    id,
    kind: "section" as const,
    props: {},
    ...(children ? { children } : {}),
  } as BlockNode;
}

function row(...children: BlockNode[]): BlockNode {
  return {
    id: `row-${children.length}`,
    kind: "row" as const,
    props: {},
    children,
  } as BlockNode;
}

describe("blockTree primitives", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("findPath", () => {
    it("finds a node at the root", () => {
      const tree = [node("a"), node("b")];
      expect(findPath(tree, "a")).toEqual([0]);
      expect(findPath(tree, "b")).toEqual([1]);
    });

    it("finds a nested node", () => {
      const tree = [node("a", [node("a1"), node("a2")])];
      expect(findPath(tree, "a1")).toEqual([0, 0]);
      expect(findPath(tree, "a2")).toEqual([0, 1]);
    });

    it("finds deeply nested nodes", () => {
      const tree = [node("a", [node("a1", [node("a1a"), node("a1b")])])];
      expect(findPath(tree, "a1a")).toEqual([0, 0, 0]);
      expect(findPath(tree, "a1b")).toEqual([0, 0, 1]);
    });

    it("returns null when not found", () => {
      const tree = [node("a")];
      expect(findPath(tree, "missing")).toBeNull();
    });
  });

  describe("nodeAt", () => {
    it("reads a node at a valid path", () => {
      const tree = [node("a", [node("a1")])];
      const result = nodeAt(tree, [0, 0]);
      expect(result?.id).toBe("a1");
    });

    it("returns null for invalid path", () => {
      const tree = [node("a")];
      expect(nodeAt(tree, [0, 0])).toBeNull();
      expect(nodeAt(tree, [10])).toBeNull();
    });

    it("returns null for empty path", () => {
      const tree = [node("a")];
      expect(nodeAt(tree, [])).toBeNull();
    });
  });

  describe("isAncestor", () => {
    it("returns true when ancestor is a prefix", () => {
      expect(isAncestor([0], [0, 0])).toBe(true);
      expect(isAncestor([0, 1], [0, 1, 2])).toBe(true);
    });

    it("returns false when lengths are equal", () => {
      expect(isAncestor([0, 0], [0, 0])).toBe(false);
    });

    it("returns false when ancestor is longer", () => {
      expect(isAncestor([0, 0, 1], [0, 0])).toBe(false);
    });

    it("returns false when paths diverge", () => {
      expect(isAncestor([0, 1], [0, 2])).toBe(false);
    });
  });

  describe("insertAt", () => {
    it("inserts at the root", () => {
      const tree = [node("a")];
      const result = insertAt(tree, [1], node("b"));
      expect(result.length).toBe(2);
      expect(result[1]?.id).toBe("b");
    });

    it("inserts into a nested parent", () => {
      const tree = [node("a", [node("a1")])];
      const result = insertAt(tree, [0, 1], node("a2"));
      expect(result[0]?.children?.length).toBe(2);
      expect(result[0]?.children?.[1]?.id).toBe("a2");
    });

    it("clamps the index to the array bounds", () => {
      const tree = [node("a")];
      const result = insertAt(tree, [100], node("b"));
      expect(result.length).toBe(2);
      expect(result[1]?.id).toBe("b");
    });
  });

  describe("removeAt", () => {
    it("removes a node from the root", () => {
      const tree = [node("a"), node("b"), node("c")];
      const { tree: result, node: removed } = removeAt(tree, [1]);
      expect(result.length).toBe(2);
      expect(removed?.id).toBe("b");
    });

    it("removes a nested node", () => {
      const tree = [node("a", [node("a1"), node("a2")])];
      const { tree: result } = removeAt(tree, [0, 0]);
      expect(result[0]?.children?.length).toBe(1);
      expect(result[0]?.children?.[0]?.id).toBe("a2");
    });

    it("returns null for invalid path", () => {
      const tree = [node("a")];
      const { node: removed } = removeAt(tree, [10]);
      expect(removed).toBeNull();
    });
  });

  describe("move", () => {
    it("moves a node within the same parent", () => {
      const tree = [node("parent", [node("a"), node("b"), node("c")])];
      const result = move(tree, [0, 0], [0, 2]);
      expect(result[0]?.children?.[0]?.id).toBe("b");
      expect(result[0]?.children?.[1]?.id).toBe("a");
      expect(result[0]?.children?.length).toBe(3);
    });

    it("moves a node to a different parent", () => {
      const tree = [node("a", [node("a1")]), node("b", [node("b1")])];
      const result = move(tree, [0, 0], [1, 1]);
      expect(result[0]?.children?.length).toBe(0);
      expect(result[1]?.children?.length).toBe(2);
      expect(result[1]?.children?.[1]?.id).toBe("a1");
    });

    it("rejects moving a node into its own subtree", () => {
      const tree = [node("a", [node("a1", [node("a1a")])])];
      const result = move(tree, [0, 0], [0, 0, 0, 0]);
      expect(result).toEqual(tree);
    });

    it("is a no-op for identical from/to paths", () => {
      const tree = [node("a", [node("a1")])];
      const result = move(tree, [0, 0], [0, 0]);
      expect(result).toEqual(tree);
    });
  });

  describe("insertSibling", () => {
    it("inserts before an anchor", () => {
      const tree = [node("a"), node("b")];
      const result = insertSibling(tree, "b", "before", node("x"));
      expect(result[0]?.id).toBe("a");
      expect(result[1]?.id).toBe("x");
      expect(result[2]?.id).toBe("b");
    });

    it("inserts after an anchor", () => {
      const tree = [node("a"), node("b")];
      const result = insertSibling(tree, "a", "after", node("x"));
      expect(result[0]?.id).toBe("a");
      expect(result[1]?.id).toBe("x");
      expect(result[2]?.id).toBe("b");
    });

    it("handles nested anchors", () => {
      const tree = [node("parent", [node("a"), node("b")])];
      const result = insertSibling(tree, "a", "after", node("x"));
      expect(result[0]?.children?.length).toBe(3);
      expect(result[0]?.children?.[1]?.id).toBe("x");
    });

    it("returns unchanged tree if anchor not found", () => {
      const tree = [node("a")];
      const result = insertSibling(tree, "missing", "after", node("x"));
      expect(result).toEqual(tree);
    });
  });

  describe("insertChild", () => {
    it("appends a child to a container", () => {
      const tree = [node("section", [node("a")])];
      const result = insertChild(tree, "section", node("b"));
      expect(result[0]?.children?.length).toBe(2);
      expect(result[0]?.children?.[1]?.id).toBe("b");
    });

    it("inserts a child at a specific index", () => {
      const tree = [node("section", [node("a"), node("c")])];
      const result = insertChild(tree, "section", node("b"), 1);
      expect(result[0]?.children?.map((n) => n.id)).toEqual(["a", "b", "c"]);
    });

    it("is a no-op for non-container kinds", () => {
      const tree: BlockNode[] = [
        { ...node("leaf"), kind: "heading" as const } as BlockNode,
      ];
      const result = insertChild(tree, "leaf", node("child"));
      expect(result).toEqual(tree);
    });

    it("returns unchanged tree if parent not found", () => {
      const tree = [node("a")];
      const result = insertChild(tree, "missing", node("child"));
      expect(result).toEqual(tree);
    });
  });

  describe("wrapInRow", () => {
    it("wraps an anchor with a new block in a row", () => {
      const tree = [node("a")];
      const result = wrapInRow(tree, "a", "left", node("x"), (children) =>
        row(...children),
      );
      expect(result[0]?.kind).toBe("row");
      expect(result[0]?.children?.length).toBe(2);
      expect(result[0]?.children?.[0]?.id).toBe("x");
      expect(result[0]?.children?.[1]?.id).toBe("a");
    });

    it("places the new block on the right when specified", () => {
      const tree = [node("a")];
      const result = wrapInRow(tree, "a", "right", node("x"), (children) =>
        row(...children),
      );
      expect(result[0]?.children?.[0]?.id).toBe("a");
      expect(result[0]?.children?.[1]?.id).toBe("x");
    });

    it("works with nested anchors", () => {
      const tree = [node("parent", [node("a")])];
      const result = wrapInRow(tree, "a", "left", node("x"), (children) =>
        row(...children),
      );
      expect(result[0]?.children?.[0]?.kind).toBe("row");
      expect(result[0]?.children?.[0]?.children?.length).toBe(2);
    });

    it("returns unchanged tree if anchor not found", () => {
      const tree = [node("a")];
      const result = wrapInRow(tree, "missing", "left", node("x"), (children) =>
        row(...children),
      );
      expect(result).toEqual(tree);
    });
  });

  describe("unwrapEmpty", () => {
    it("removes empty row containers", () => {
      const tree = [
        node("a"),
        {
          id: "empty-row",
          kind: "row" as const,
          props: {},
          children: [],
        } as BlockNode,
        node("b"),
      ];
      const result = unwrapEmpty(tree);
      expect(result.length).toBe(2);
      expect(result.map((n) => n.id)).toEqual(["a", "b"]);
    });

    it("unwraps single-child row containers", () => {
      const tree = [
        node("a"),
        {
          id: "row",
          kind: "row" as const,
          props: {},
          children: [node("inner")],
        } as BlockNode,
        node("b"),
      ];
      const result = unwrapEmpty(tree);
      expect(result.length).toBe(3);
      expect(result[1]?.id).toBe("inner");
    });

    it("preserves empty sections", () => {
      const tree = [
        {
          id: "section",
          kind: "section" as const,
          props: {},
          children: [],
        } as BlockNode,
      ];
      const result = unwrapEmpty(tree);
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("section");
    });

    it("recursively unwraps nested empty containers", () => {
      const tree = [
        node("parent", [
          { id: "row", kind: "row", props: {}, children: [node("inner")] },
        ]),
      ];
      const result = unwrapEmpty(tree);
      expect(result[0]?.children?.[0]?.id).toBe("inner");
    });
  });

  describe("duplicate", () => {
    it("clones a block and inserts it as a sibling", () => {
      const tree = [node("a"), node("b"), node("c")];
      const result = duplicate(tree, "a", (oldId) => `copy-of-${oldId}`);
      expect(result.length).toBe(4);
      expect(result[1]?.id).toBe("copy-of-a");
    });

    it("returns unchanged tree if source not found", () => {
      const tree = [node("a")];
      const result = duplicate(tree, "missing", (id) => `copy-${id}`);
      expect(result).toEqual(tree);
    });
  });
});
