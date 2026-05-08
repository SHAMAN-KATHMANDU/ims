/**
 * Site schema — shared block/layout contracts between the API (writer +
 * validator) and the tenant-site renderer (reader).
 *
 * Phase 1 only ships block primitives. Nav config + theme tokens land in
 * Phases 2 and 7 respectively.
 */

export * from "./blocks";
export * from "./nav";
export * from "./footer";
export * from "./theme";
export * from "./templates";
export * from "./media";
