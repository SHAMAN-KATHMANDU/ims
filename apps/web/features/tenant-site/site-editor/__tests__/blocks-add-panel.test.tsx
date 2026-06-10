/**
 * BlocksAddPanel: preset variants share a block kind but differ in default
 * props. Clicking a tile must insert THAT entry's defaults (a kind-based
 * lookup always resolved to the base variant), and tiles must have unique
 * identities so React doesn't drop/duplicate them.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { BlocksAddPanel } from "../layers/BlocksAddPanel";

describe("BlocksAddPanel", () => {
  beforeEach(() => {
    useEditorStore.getState().load([]);
  });

  it("renders one tile per catalog entry (variants included)", () => {
    render(<BlocksAddPanel />);
    const tiles = screen.getAllByRole("button");
    expect(tiles).toHaveLength(BLOCK_CATALOG_ENTRIES.length);
  });

  it("catalog identities (id ?? kind) are unique", () => {
    const identities = BLOCK_CATALOG_ENTRIES.map((e) => e.id ?? e.kind);
    expect(new Set(identities).size).toBe(identities.length);
  });

  it("clicking the base Product grid tile inserts the base preset", () => {
    render(<BlocksAddPanel />);
    fireEvent.click(screen.getByText("Product grid"));

    const blocks = useEditorStore.getState().present.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("product-grid");
    expect((blocks[0]?.props as { source?: string }).source).toBe("featured");
  });

  it("clicking a variant tile inserts that variant's preset, not the base", () => {
    render(<BlocksAddPanel />);
    fireEvent.click(screen.getByText("New Arrivals"));

    const blocks = useEditorStore.getState().present.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("product-grid");
    expect((blocks[0]?.props as { source?: string }).source).toBe("newest");
  });

  it("dragging a variant tile carries its catalog id", () => {
    render(<BlocksAddPanel />);
    const tile = screen.getByText("Hot Deals").closest('[role="button"]');
    expect(tile).not.toBeNull();

    const data: Record<string, string> = {};
    fireEvent.dragStart(tile!, {
      dataTransfer: {
        setData: (k: string, v: string) => {
          data[k] = v;
        },
        effectAllowed: "",
      },
    });

    expect(data["application/x-block-kind"]).toBe("product-grid");
    expect(data["application/x-block-catalog-id"]).toBe(
      "product-grid-hot-deals",
    );
  });
});
