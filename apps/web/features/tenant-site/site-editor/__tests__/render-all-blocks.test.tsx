/**
 * Editor-canvas conformance: every block in the palette must render with its
 * own catalog default props and the editor's MOCK_DATA_CONTEXT — exactly the
 * combination `BlockView` produces when a user clicks the block in the
 * "Add blocks" panel. A block that throws here crashes the live editor.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import type { BlockNode } from "@repo/shared";
import { blockRegistry, MOCK_DATA_CONTEXT } from "@repo/blocks";

describe("every catalog block renders with default props in the editor canvas", () => {
  it("has a registry component for every catalog entry", () => {
    const missing = BLOCK_CATALOG_ENTRIES.filter(
      (entry) => !blockRegistry[entry.kind],
    ).map((entry) => entry.kind);
    expect(missing).toEqual([]);
  });

  for (const entry of BLOCK_CATALOG_ENTRIES) {
    it(`renders ${entry.kind}`, () => {
      const registryEntry = blockRegistry[entry.kind];
      if (!registryEntry) return; // covered by the assertion above

      const node: BlockNode = {
        id: `test-${entry.kind}`,
        kind: entry.kind,
        props: entry.createDefaultProps(),
      };
      const Component = registryEntry.component;

      expect(() =>
        renderToString(
          <Component
            node={node}
            props={node.props}
            dataContext={MOCK_DATA_CONTEXT}
          />,
        ),
      ).not.toThrow();
    });
  }
});
