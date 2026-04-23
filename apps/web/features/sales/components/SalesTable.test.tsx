import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SalesTable } from "./SalesTable";
import type { Sale } from "../hooks/use-sales";

const mockOnView = vi.fn();

const mockSales: Sale[] = [
  {
    id: "s1",
    saleCode: "S-001",
    type: "GENERAL",
    isCreditSale: false,
    locationId: "loc1",
    subtotal: 100,
    discount: 0,
    total: 100,
    createdById: "u1",
    createdAt: "2024-01-15T10:00:00Z",
    location: { id: "loc1", name: "Warehouse" },
    createdBy: { id: "u1", username: "admin", role: "admin" },
  },
  {
    id: "s2",
    saleCode: "S-002",
    type: "MEMBER",
    isCreditSale: true,
    locationId: "loc2",
    memberId: "m1",
    subtotal: 200,
    discount: 20,
    total: 180,
    createdById: "u1",
    createdAt: "2024-01-16T11:00:00Z",
    location: { id: "loc2", name: "Showroom" },
    member: { id: "m1", phone: "+9779812345678", name: "John" },
    createdBy: { id: "u1", username: "admin", role: "admin" },
  },
];

describe("SalesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading", () => {
    render(<SalesTable sales={[]} isLoading={true} onView={mockOnView} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders empty state when no sales", () => {
    render(<SalesTable sales={[]} isLoading={false} onView={mockOnView} />);

    expect(screen.getByText(/no sales yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/new sales will appear here once recorded/i),
    ).toBeInTheDocument();
  });

  it("renders filter-aware empty state with clear-filters CTA", () => {
    const onClearFilters = vi.fn();
    render(
      <SalesTable
        sales={[]}
        isLoading={false}
        onView={mockOnView}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />,
    );

    expect(
      screen.getByText(/no sales match your filters/i),
    ).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("renders sales rows and calls onView when View clicked", () => {
    render(
      <SalesTable sales={mockSales} isLoading={false} onView={mockOnView} />,
    );

    expect(screen.getByText("S-001")).toBeInTheDocument();
    expect(screen.getByText("S-002")).toBeInTheDocument();

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[0]!);

    expect(mockOnView).toHaveBeenCalledWith(mockSales[0]);
  });
});
