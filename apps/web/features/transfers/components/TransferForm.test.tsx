import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransferForm } from "./TransferForm";

const mockOnSubmit = vi.fn();
const mockOnOpenChange = vi.fn();
const mockGetLocationInventory = vi.fn();

const mockLocations = [
  {
    id: "loc1",
    name: "Warehouse",
    type: "WAREHOUSE" as const,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "loc2",
    name: "Showroom",
    type: "SHOWROOM" as const,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const mockInventory = [
  {
    id: "inv1",
    variationId: "var1",
    subVariationId: null,
    quantity: 10,
    variation: {
      id: "var1",
      product: { id: "p1", imsCode: "P-001", name: "Widget" },
      attributes: [],
    },
  },
];

const mockPaginatedInventory = {
  data: mockInventory,
  pagination: { totalItems: 1, totalPages: 1, page: 1, limit: 3 },
};

describe("TransferForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocationInventory.mockResolvedValue(mockPaginatedInventory);
  });

  it("renders location selects and add items section when inline", async () => {
    render(
      <TransferForm
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onSubmit={mockOnSubmit}
        getLocationInventory={mockGetLocationInventory}
        inline={true}
      />,
    );

    expect(screen.getByText("From Location *")).toBeInTheDocument();
    expect(screen.getByText("To Location *")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /create transfer/i }),
    ).toBeInTheDocument();
  });

  it("fetches inventory when user searches after selecting from location", async () => {
    render(
      <TransferForm
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onSubmit={mockOnSubmit}
        getLocationInventory={mockGetLocationInventory}
        inline={true}
      />,
    );

    const fromSelects = document.querySelectorAll<HTMLSelectElement>("select");
    const fromSelect = Array.from(fromSelects).find((s) =>
      s.querySelector('option[value="loc1"]'),
    );
    expect(fromSelect).toBeTruthy();
    fireEvent.change(fromSelect!, { target: { value: "loc1" } });

    const searchInput = screen.getByPlaceholderText(
      /search by product name, product code, or category/i,
    );
    fireEvent.change(searchInput, { target: { value: "widget" } });

    await waitFor(
      () => {
        expect(mockGetLocationInventory).toHaveBeenCalledWith("loc1", {
          search: "widget",
          limit: 3,
          page: 1,
          sortBy: "name",
          sortOrder: "asc",
        });
      },
      { timeout: 500 },
    );
  });

  it("submit button disabled until from, to, and items filled", () => {
    render(
      <TransferForm
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onSubmit={mockOnSubmit}
        getLocationInventory={mockGetLocationInventory}
        inline={true}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /create transfer/i });
    expect(submitBtn).toBeDisabled();
  });

  /** Select source location, search, and add the first inventory result. */
  async function addFirstItem() {
    const fromSelects = document.querySelectorAll<HTMLSelectElement>("select");
    const fromSelect = Array.from(fromSelects).find((s) =>
      s.querySelector('option[value="loc1"]'),
    );
    fireEvent.change(fromSelect!, { target: { value: "loc1" } });

    const searchInput = screen.getByPlaceholderText(
      /search by product name, product code, or category/i,
    );
    fireEvent.change(searchInput, { target: { value: "widget" } });

    const addBtn = await screen.findByRole("button", {
      name: /add widget to transfer/i,
    });
    fireEvent.click(addBtn);
  }

  it("lets the user type a quantity directly, clamping to source stock", async () => {
    render(
      <TransferForm
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onSubmit={mockOnSubmit}
        getLocationInventory={mockGetLocationInventory}
        inline={true}
      />,
    );

    await addFirstItem();

    const qtyInput = await screen.findByLabelText<HTMLInputElement>("Quantity");
    expect(qtyInput.value).toBe("1");

    // Direct keyboard input within stock updates the quantity.
    fireEvent.change(qtyInput, { target: { value: "5" } });
    expect(qtyInput.value).toBe("5");

    // Typing above available stock (10) clamps back to the max.
    fireEvent.change(qtyInput, { target: { value: "999" } });
    expect(qtyInput.value).toBe("10");

    // A zero/negative entry is floored to the minimum of 1.
    fireEvent.change(qtyInput, { target: { value: "0" } });
    expect(qtyInput.value).toBe("1");
  });
});
