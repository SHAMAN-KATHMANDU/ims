/**
 * Block catalog ⟷ schema conformance.
 *
 * The two registries — `BLOCK_CATALOG_ENTRIES` (palette metadata + default
 * props factories) and `BLOCK_PROPS_SCHEMAS` (Zod validators) — must
 * agree: every catalog entry's `createDefaultProps()` output must pass
 * the matching schema, and every registered block kind must have both a
 * schema and at least one catalog entry.
 *
 * Without these checks, a developer can ship a catalog whose default
 * props the editor immediately rejects on first save — the block lands
 * in the canvas, the user types nothing, hits save, gets a 400. This
 * file turns that into a CI failure on the PR that introduced the drift,
 * and locks the invariant in advance of the Phase 5 variant work, where
 * each variant adds another `createDefaultProps()` factory we need to
 * keep aligned with the schema.
 */

import { describe, it, expect } from "vitest";
import { BLOCK_CATALOG_ENTRIES, BLOCK_PROPS_SCHEMAS } from "./index";

describe("block catalog conformance", () => {
  it("every catalog entry's createDefaultProps() passes its schema", () => {
    const failures: string[] = [];
    for (const entry of BLOCK_CATALOG_ENTRIES) {
      const schema = BLOCK_PROPS_SCHEMAS[entry.kind];
      if (!schema) {
        failures.push(`${entry.kind}: missing schema in BLOCK_PROPS_SCHEMAS`);
        continue;
      }
      const props = entry.createDefaultProps();
      const result = schema.safeParse(props);
      if (!result.success) {
        const issue = result.error.issues[0];
        failures.push(
          `${entry.kind} (catalog "${entry.label}"): ${issue?.path.join(".")} ${issue?.message}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("every BlockKind in BLOCK_PROPS_SCHEMAS has at least one catalog entry", () => {
    const catalogKinds = new Set(BLOCK_CATALOG_ENTRIES.map((e) => e.kind));
    const schemaKinds = Object.keys(BLOCK_PROPS_SCHEMAS);
    const missing = schemaKinds.filter((kind) => !catalogKinds.has(kind));
    expect(missing).toEqual([]);
  });

  it("catalog entries reference only kinds that exist in BLOCK_PROPS_SCHEMAS", () => {
    // The reverse direction — guards against catalog entries pointing at
    // a removed/renamed block kind. The variant work in Phase 5 will add
    // multiple catalog entries per kind, so this check stays meaningful.
    const schemaKinds = new Set(Object.keys(BLOCK_PROPS_SCHEMAS));
    const orphans = BLOCK_CATALOG_ENTRIES.filter(
      (e) => !schemaKinds.has(e.kind),
    );
    expect(orphans.map((e) => `${e.label} (${e.kind})`)).toEqual([]);
  });
});
