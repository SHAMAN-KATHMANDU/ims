/**
 * Store selectors — selectSelectedBlock must walk the whole tree (the
 * inspector showed "no block selected" for nested blocks when it used a
 * root-level find).
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectSelectedBlock,
  selectCanUndo,
  selectCanRedo,
} from "../store/selectors";

const tree: BlockNode[] = [
  {
    id: "sec-1",
    kind: "section",
    props: {},
    children: [
      {
        id: "row-1",
        kind: "row",
        props: {},
        children: [{ id: "img-1", kind: "image", props: {} }],
      },
    ],
  },
] as BlockNode[];

describe("selectSelectedBlock", () => {
  beforeEach(() => {
    useEditorStore.getState().load(tree);
  });

  it("finds a root block", () => {
    useEditorStore.getState().setSelected("sec-1");
    const block = selectSelectedBlock(useEditorStore.getState());
    expect(block?.id).toBe("sec-1");
  });

  it("finds a deeply nested block", () => {
    useEditorStore.getState().setSelected("img-1");
    const block = selectSelectedBlock(useEditorStore.getState());
    expect(block?.id).toBe("img-1");
    expect(block?.kind).toBe("image");
  });

  it("returns null when nothing is selected", () => {
    useEditorStore.getState().setSelected(null);
    expect(selectSelectedBlock(useEditorStore.getState())).toBeNull();
  });

  it("returns null for an id no longer in the tree", () => {
    useEditorStore.getState().setSelected("img-1");
    useEditorStore.getState().removeBlock("row-1");
    expect(selectSelectedBlock(useEditorStore.getState())).toBeNull();
  });
});

describe("selectCanUndo / selectCanRedo", () => {
  beforeEach(() => {
    useEditorStore.getState().load(tree);
  });

  it("both false right after load", () => {
    expect(selectCanUndo(useEditorStore.getState())).toBe(false);
    expect(selectCanRedo(useEditorStore.getState())).toBe(false);
  });

  it("canUndo after a mutation; canRedo after an undo", () => {
    useEditorStore.getState().removeBlock("img-1");
    expect(selectCanUndo(useEditorStore.getState())).toBe(true);
    useEditorStore.getState().undo();
    expect(selectCanRedo(useEditorStore.getState())).toBe(true);
  });

  it("redo stack clears on a new mutation", () => {
    useEditorStore.getState().removeBlock("img-1");
    useEditorStore.getState().undo();
    useEditorStore.getState().removeBlock("sec-1");
    expect(selectCanRedo(useEditorStore.getState())).toBe(false);
  });
});
