/**
 * Tests for <Can> — inline permission gate component.
 *
 * Covers:
 *  - Renders children when allowed=true
 *  - Renders null (default) when allowed=false
 *  - Renders fallback prop when allowed=false and fallback provided
 *  - Renders loading prop while isLoading=true
 *  - Renders null during loading when no loading prop provided
 *  - Passes perm + resourceId through to useCan
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Hook mock (hoisted) ──────────────────────────────────────────────────────

const mockUseCan = vi.fn();

vi.mock("../hooks/use-permissions", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { Can } from "./Can";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("<Can>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when the user has the permission", () => {
    mockUseCan.mockReturnValue({ allowed: true, isLoading: false });

    render(
      <Can perm="INVENTORY.PRODUCTS.VIEW">
        <span>Protected content</span>
      </Can>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders nothing (default fallback=null) when the user lacks the permission", () => {
    mockUseCan.mockReturnValue({ allowed: false, isLoading: false });

    render(
      <Can perm="INVENTORY.PRODUCTS.VIEW">
        <span>Protected content</span>
      </Can>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the fallback element when the user lacks the permission", () => {
    mockUseCan.mockReturnValue({ allowed: false, isLoading: false });

    render(
      <Can perm="INVENTORY.PRODUCTS.VIEW" fallback={<span>Access denied</span>}>
        <span>Protected content</span>
      </Can>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("renders the loading slot while the bitset is still loading", () => {
    mockUseCan.mockReturnValue({ allowed: false, isLoading: true });

    render(
      <Can
        perm="INVENTORY.PRODUCTS.VIEW"
        loading={<span>Checking permissions…</span>}
      >
        <span>Protected content</span>
      </Can>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText("Checking permissions…")).toBeInTheDocument();
  });

  it("renders nothing during loading when no loading prop is provided", () => {
    mockUseCan.mockReturnValue({ allowed: false, isLoading: true });

    render(
      <Can perm="INVENTORY.PRODUCTS.VIEW">
        <span>Protected content</span>
      </Can>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("passes perm to useCan", () => {
    mockUseCan.mockReturnValue({ allowed: true, isLoading: false });

    render(
      <Can perm="SETTINGS.ROLES.MANAGE">
        <span>Manage roles</span>
      </Can>,
    );

    expect(mockUseCan).toHaveBeenCalledWith("SETTINGS.ROLES.MANAGE", undefined);
  });

  it("passes resourceId to useCan when provided", () => {
    mockUseCan.mockReturnValue({ allowed: true, isLoading: false });

    render(
      <Can perm="INVENTORY.PRODUCTS.VIEW" resourceId="res-abc">
        <span>Scoped content</span>
      </Can>,
    );

    expect(mockUseCan).toHaveBeenCalledWith(
      "INVENTORY.PRODUCTS.VIEW",
      "res-abc",
    );
  });

  it("does not render children if allowed=false even when fallback is absent", () => {
    mockUseCan.mockReturnValue({ allowed: false, isLoading: false });

    const { container } = render(
      <Can perm="INVENTORY.PRODUCTS.DELETE">
        <button>Delete</button>
      </Can>,
    );

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(container.innerHTML).toBe("");
  });
});
