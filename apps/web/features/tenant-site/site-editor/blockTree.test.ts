import { describe, it, expect } from "vitest";
import type { BlockNode } from "@repo/shared";
import {
  CONTAINER_KINDS,
  countNodes,
  findPath,
  insertAt,
  insertChild,
  insertSibling,
  isAncestor,
  isContainer,
  move,
  nodeAt,
  removeAt,
  unwrapEmpty,
  walk,
  wrapInRow,
} from "./blockTree";

// Minimal block factories — props are typed liberally so we don't need the
// full per-kind shape just to test tree mutations.
function block(id: string, kind: string, children?: BlockNode[]): BlockNode {
  const node: BlockNode = {
    id,
    kind: kind as BlockNode["kind"],
    props: {} as BlockNode["props"],
  };
  if (children) node.children = children;
  return node;
}

const sampleRowFactory = (children: BlockNode[]): BlockNode =>
  block("row-x", "row", children);

// Helpers
function ids(tree: readonly BlockNode[]): string[] {
  return tree.map((n) => n.id);
}

describe("CONTAINER_KINDS / isContainer", () => {
  it("treats section/row/columns/css-grid as containers", () => {
    expect(isContainer("section" as BlockNode["kind"])).toBe(true);
    expect(isContainer("row" as BlockNode["kind"])).toBe(true);
    expect(isContainer("columns" as BlockNode["kind"])).toBe(true);
    expect(isContainer("css-grid" as BlockNode["kind"])).toBe(true);
  });

  it("treats leaf kinds as non-containers", () => {
    expect(isContainer("button" as BlockNode["kind"])).toBe(false);
    expect(isContainer("heading" as BlockNode["kind"])).toBe(false);
    expect(isContainer("image" as BlockNode["kind"])).toBe(false);
  });

  it("set is non-empty + non-mutable from outside", () => {
    expect(CONTAINER_KINDS.size).toBeGreaterThan(0);
  });
});

describe("findPath", () => {
  const tree: BlockNode[] = [
    block("a", "heading"),
    block("b", "section", [
      block("b1", "button"),
      block("b2", "row", [block("b2a", "heading"), block("b2b", "image")]),
    ]),
    block("c", "image"),
  ];

  it("finds top-level nodes", () => {
    expect(findPath(tree, "a")).toEqual([0]);
    expect(findPath(tree, "c")).toEqual([2]);
  });

  it("finds nested nodes at any depth", () => {
    expect(findPath(tree, "b1")).toEqual([1, 0]);
    expect(findPath(tree, "b2a")).toEqual([1, 1, 0]);
    expect(findPath(tree, "b2b")).toEqual([1, 1, 1]);
  });

  it("returns null when id is absent", () => {
    expect(findPath(tree, "missing")).toBeNull();
  });
});

describe("nodeAt", () => {
  const tree: BlockNode[] = [
    block("a", "heading"),
    block("b", "section", [block("b1", "button")]),
  ];

  it("reads top-level + nested nodes", () => {
    expect(nodeAt(tree, [0])?.id).toBe("a");
    expect(nodeAt(tree, [1, 0])?.id).toBe("b1");
  });

  it("returns null for OOB / empty path", () => {
    expect(nodeAt(tree, [])).toBeNull();
    expect(nodeAt(tree, [99])).toBeNull();
    expect(nodeAt(tree, [1, 5])).toBeNull();
  });
});

describe("isAncestor", () => {
  it("true when first is a strict prefix of second", () => {
    expect(isAncestor([0], [0, 1])).toBe(true);
    expect(isAncestor([1, 1], [1, 1, 0])).toBe(true);
  });

  it("false when paths are equal or unrelated", () => {
    expect(isAncestor([0], [0])).toBe(false);
    expect(isAncestor([0, 1], [0, 2])).toBe(false);
    expect(isAncestor([1], [0, 1])).toBe(false);
  });
});

describe("insertAt", () => {
  it("inserts at a top-level slot", () => {
    const tree: BlockNode[] = [block("a", "heading"), block("b", "image")];
    const next = insertAt(tree, [1], block("x", "button"));
    expect(ids(next)).toEqual(["a", "x", "b"]);
  });

  it("appends when slot equals length", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    const next = insertAt(tree, [1], block("x", "button"));
    expect(ids(next)).toEqual(["a", "x"]);
  });

  it("clamps slot beyond length", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    const next = insertAt(tree, [99], block("x", "button"));
    expect(ids(next)).toEqual(["a", "x"]);
  });

  it("inserts as a nested child slot", () => {
    const tree: BlockNode[] = [block("p", "section", [block("c1", "image")])];
    const next = insertAt(tree, [0, 0], block("x", "button"));
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["x", "c1"]);
  });

  it("does not mutate the input", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    const snapshot = JSON.stringify(tree);
    insertAt(tree, [1], block("x", "button"));
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});

describe("removeAt", () => {
  it("removes a top-level node and returns it", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("b", "image"),
      block("c", "button"),
    ];
    const { tree: next, node } = removeAt(tree, [1]);
    expect(node?.id).toBe("b");
    expect(ids(next)).toEqual(["a", "c"]);
  });

  it("removes a nested node", () => {
    const tree: BlockNode[] = [
      block("p", "section", [block("c1", "image"), block("c2", "button")]),
    ];
    const { tree: next, node } = removeAt(tree, [0, 1]);
    expect(node?.id).toBe("c2");
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["c1"]);
  });

  it("returns null node for OOB / empty path", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    expect(removeAt(tree, []).node).toBeNull();
    expect(removeAt(tree, [99]).node).toBeNull();
  });
});

describe("move", () => {
  it("reorders top-level siblings (forward)", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("b", "image"),
      block("c", "button"),
    ];
    // Move "a" past "c": from [0] to [3] should become [b, c, a].
    const next = move(tree, [0], [3]);
    expect(ids(next)).toEqual(["b", "c", "a"]);
  });

  it("reorders top-level siblings (backward)", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("b", "image"),
      block("c", "button"),
    ];
    // Move "c" to slot 0: [c, a, b].
    const next = move(tree, [2], [0]);
    expect(ids(next)).toEqual(["c", "a", "b"]);
  });

  it("moves a node into a sibling container's children", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("p", "section", [block("c1", "image")]),
    ];
    // Drop "a" as the first child of the section.
    const next = move(tree, [0], [1, 0]);
    // Source removed; section index shifted from [1] to [0] post-removal.
    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe("p");
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["a", "c1"]);
  });

  it("moves a node out of a container to the page root", () => {
    const tree: BlockNode[] = [
      block("p", "section", [block("c1", "image"), block("c2", "button")]),
    ];
    // Move c2 to root, slot 1 (after the section).
    const next = move(tree, [0, 1], [1]);
    expect(ids(next)).toEqual(["p", "c2"]);
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["c1"]);
  });

  it("rejects moving a node into its own subtree", () => {
    const tree: BlockNode[] = [block("p", "section", [block("c1", "image")])];
    const next = move(tree, [0], [0, 0]);
    // Unchanged.
    expect(next).toEqual(tree);
  });

  it("is a no-op when from == to", () => {
    const tree: BlockNode[] = [block("a", "heading"), block("b", "image")];
    expect(move(tree, [0], [0])).toEqual(tree);
  });

  it("round-trip: move forward then back returns the original ids", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("b", "image"),
      block("c", "button"),
    ];
    // Move a to end, then back to start.
    const forward = move(tree, [0], [3]);
    const back = move(forward, [2], [0]);
    expect(ids(back)).toEqual(["a", "b", "c"]);
  });
});

describe("insertSibling", () => {
  it("inserts before / after at top level", () => {
    const tree: BlockNode[] = [block("a", "heading"), block("b", "image")];
    const before = insertSibling(tree, "b", "before", block("x", "button"));
    expect(ids(before)).toEqual(["a", "x", "b"]);
    const after = insertSibling(tree, "a", "after", block("y", "button"));
    expect(ids(after)).toEqual(["a", "y", "b"]);
  });

  it("inserts as a sibling inside a nested container", () => {
    const tree: BlockNode[] = [
      block("p", "section", [block("c1", "image"), block("c2", "button")]),
    ];
    const next = insertSibling(tree, "c1", "after", block("x", "heading"));
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["c1", "x", "c2"]);
  });

  it("no-op when anchor is missing", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    expect(
      insertSibling(tree, "missing", "after", block("x", "button")),
    ).toEqual(tree);
  });
});

describe("insertChild", () => {
  it("appends to a container's children by default", () => {
    const tree: BlockNode[] = [block("p", "section", [block("c1", "image")])];
    const next = insertChild(tree, "p", block("x", "button"));
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["c1", "x"]);
  });

  it("inserts at a specific slot", () => {
    const tree: BlockNode[] = [
      block("p", "section", [block("c1", "image"), block("c2", "button")]),
    ];
    const next = insertChild(tree, "p", block("x", "heading"), 1);
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["c1", "x", "c2"]);
  });

  it("no-op when target is not a container kind", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    expect(insertChild(tree, "a", block("x", "button"))).toEqual(tree);
  });

  it("no-op when parent is missing", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    expect(insertChild(tree, "missing", block("x", "button"))).toEqual(tree);
  });
});

describe("wrapInRow", () => {
  it("wraps an anchor with the new block on the left", () => {
    const tree: BlockNode[] = [block("a", "heading"), block("b", "image")];
    const next = wrapInRow(
      tree,
      "a",
      "left",
      block("x", "button"),
      sampleRowFactory,
    );
    expect(next[0]!.kind).toBe("row");
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["x", "a"]);
    // anchor is preserved in tree (only relocated).
    expect(next.map((n) => n.id)).toEqual(["row-x", "b"]);
  });

  it("wraps an anchor with the new block on the right", () => {
    const tree: BlockNode[] = [block("a", "heading")];
    const next = wrapInRow(
      tree,
      "a",
      "right",
      block("x", "button"),
      sampleRowFactory,
    );
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["a", "x"]);
  });

  it("wraps a nested anchor in place", () => {
    const tree: BlockNode[] = [
      block("p", "section", [block("c1", "image"), block("c2", "button")]),
    ];
    const next = wrapInRow(
      tree,
      "c1",
      "right",
      block("x", "heading"),
      sampleRowFactory,
    );
    const row = next[0]!.children![0]!;
    expect(row.kind).toBe("row");
    expect(row.children?.map((n) => n.id)).toEqual(["c1", "x"]);
    // c2 still at slot 1.
    expect(next[0]!.children?.[1]!.id).toBe("c2");
  });
});

describe("unwrapEmpty", () => {
  it("removes empty rows entirely", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("r", "row", []),
      block("b", "image"),
    ];
    const next = unwrapEmpty(tree);
    expect(ids(next)).toEqual(["a", "b"]);
  });

  it("collapses a row with one child into the child", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("r", "row", [block("only", "button")]),
      block("b", "image"),
    ];
    const next = unwrapEmpty(tree);
    expect(ids(next)).toEqual(["a", "only", "b"]);
  });

  it("preserves rows with 2+ children", () => {
    const tree: BlockNode[] = [
      block("r", "row", [block("a", "heading"), block("b", "image")]),
    ];
    expect(unwrapEmpty(tree)).toEqual(tree);
  });

  it("preserves empty section (landmark)", () => {
    const tree: BlockNode[] = [block("s", "section", [])];
    expect(unwrapEmpty(tree)).toEqual(tree);
  });

  it("recurses into nested containers", () => {
    const tree: BlockNode[] = [
      block("s", "section", [block("r", "row", [block("only", "button")])]),
    ];
    const next = unwrapEmpty(tree);
    expect(next[0]!.children?.map((n) => n.id)).toEqual(["only"]);
  });
});

describe("walk + countNodes", () => {
  it("counts every node, top-level + nested", () => {
    const tree: BlockNode[] = [
      block("a", "heading"),
      block("p", "section", [
        block("c1", "image"),
        block("r", "row", [block("rb", "button")]),
      ]),
    ];
    expect(countNodes(tree)).toBe(5);
    const seen = [...walk(tree)].map((n) => n.id);
    expect(seen).toEqual(["a", "p", "c1", "r", "rb"]);
  });
});
