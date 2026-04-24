/**
 * Tests for useCan() — fail-closed auth gate.
 *
 * Covers:
 *  - isLoading=true / allowed=false while the query is pending
 *  - allowed=false when bit is not set
 *  - allowed=true when the specific bit is set
 *  - ADMINISTRATOR bit (511) bypasses all checks
 *  - allowed=false for unknown permission keys
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";
import { setBit, toBase64, empty } from "../lib/bitset";
import { PERMISSION_BY_KEY, ADMINISTRATOR_BIT } from "@repo/shared";

// ─── Service mock (hoisted) ───────────────────────────────────────────────────

const mockGetEffectivePermissions = vi.fn();

vi.mock("../services/permissions.service", () => ({
  getEffectivePermissions: (...args: unknown[]) =>
    mockGetEffectivePermissions(...args),
  getRoles: vi.fn(),
  getRoleById: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  getRoleMembers: vi.fn(),
  assignUserToRole: vi.fn(),
  unassignUserFromRole: vi.fn(),
  getOverwrites: vi.fn(),
  upsertOverwrite: vi.fn(),
  deleteOverwrite: vi.fn(),
  bulkResolvePermissions: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { useCan } from "./use-permissions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientWrapper, null, children);

/** Build a base64 bitset with the given bits set. */
function makeBase64(...bits: number[]): string {
  let buf = empty();
  for (const bit of bits) buf = setBit(buf, bit);
  return toBase64(buf);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useCan()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isLoading=true and allowed=false while the query is pending", () => {
    // Never-resolving promise keeps the query in the loading state.
    mockGetEffectivePermissions.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCan("INVENTORY.PRODUCTS.VIEW"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.allowed).toBe(false);
  });

  it("returns allowed=false when the permission bit is not set", async () => {
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: toBase64(empty()),
    });

    const { result } = renderHook(() => useCan("INVENTORY.PRODUCTS.VIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it("returns allowed=true when the specific permission bit is set", async () => {
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: makeBase64(def.bit),
    });

    const { result } = renderHook(() => useCan("INVENTORY.PRODUCTS.VIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it("ADMINISTRATOR bit (511) bypasses all permission checks", async () => {
    // Set only the ADMINISTRATOR bit — no specific permission bit set.
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: makeBase64(ADMINISTRATOR_BIT),
    });

    const { result } = renderHook(() => useCan("INVENTORY.PRODUCTS.VIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it("ADMINISTRATOR bypasses a high-privilege permission too", async () => {
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: makeBase64(ADMINISTRATOR_BIT),
    });

    const { result } = renderHook(() => useCan("SETTINGS.ADMINISTRATOR"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(true);
  });

  it("returns allowed=false for an unknown permission key", async () => {
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: makeBase64(0, 1, 2),
    });

    const { result } = renderHook(() => useCan("UNKNOWN.MODULE.VIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it("does not grant permission for a different bit", async () => {
    const createDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    // Set CREATE bit, not VIEW — check VIEW is still denied
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "workspace",
      permissions: makeBase64(createDef.bit),
    });

    const { result } = renderHook(() => useCan("INVENTORY.PRODUCTS.VIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it("passes the resourceId through to useMyPermissions", async () => {
    mockGetEffectivePermissions.mockResolvedValue({
      resourceId: "res-123",
      permissions: toBase64(empty()),
    });

    const { result } = renderHook(
      () => useCan("INVENTORY.PRODUCTS.VIEW", "res-123"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetEffectivePermissions).toHaveBeenCalledWith("res-123");
  });
});
