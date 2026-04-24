import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PermissionDef } from "@repo/shared";
import { PermissionToggleRow } from "./PermissionToggleRow";

const basicDef: PermissionDef = {
  key: "INVENTORY.PRODUCTS.VIEW",
  bit: 0,
  module: "INVENTORY",
  submodule: "Products",
  action: "VIEW",
  label: "View products",
  description: "See the product catalog.",
};

const dangerousDef: PermissionDef = {
  key: "INVENTORY.PRODUCTS.DELETE",
  bit: 3,
  module: "INVENTORY",
  submodule: "Products",
  action: "DELETE",
  label: "Delete products",
  description: "Move products to trash.",
  dangerous: true,
  implies: ["INVENTORY.PRODUCTS.VIEW"],
};

describe("PermissionToggleRow", () => {
  it("renders label and description", () => {
    render(<PermissionToggleRow def={basicDef} checked={false} />);
    expect(screen.getByText("View products")).toBeInTheDocument();
    expect(screen.getByText("See the product catalog.")).toBeInTheDocument();
  });

  it("shows Dangerous badge when def.dangerous", () => {
    render(<PermissionToggleRow def={dangerousDef} checked={false} />);
    expect(screen.getByText(/Dangerous/i)).toBeInTheDocument();
  });

  it("shows Implies badge when def.implies is non-empty", () => {
    render(<PermissionToggleRow def={dangerousDef} checked={false} />);
    expect(screen.getByText(/Implies:/)).toBeInTheDocument();
    expect(screen.getByText(/View products/)).toBeInTheDocument();
  });

  it("fires onCheckedChange when the switch is toggled", () => {
    const handle = vi.fn();
    render(
      <PermissionToggleRow
        def={basicDef}
        checked={false}
        onCheckedChange={handle}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(handle).toHaveBeenCalledWith(true);
  });

  it("renders a custom control when provided (replaces switch)", () => {
    render(
      <PermissionToggleRow def={basicDef} control={<button>custom</button>} />,
    );
    expect(screen.getByRole("button", { name: "custom" })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
