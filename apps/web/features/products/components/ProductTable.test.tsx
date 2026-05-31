import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { ProductTable } from "./ProductTable";
import type { Product, ProductVariation, Category } from "@/features/products";

const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockOnPageChange = vi.fn();
const mockOnPageSizeChange = vi.fn();
const mockOnSearchChange = vi.fn();

const mockCategories: Category[] = [{ id: "cat1", name: "Electronics" }];

const mockProducts: Product[] = [
  {
    id: "p1",
    imsCode: "P-001",
    name: "Widget",
    categoryId: "cat1",
    costPrice: 50,
    mrp: 100,
    createdById: "u1",
    dateCreated: "2024-01-01",
    category: mockCategories[0],
    variations: [
      {
        id: "v1",
        productId: "p1",
        stockQuantity: 10,
      } as ProductVariation,
    ],
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 1,
  itemsPerPage: 10,
  hasNextPage: false,
  hasPrevPage: false,
};

describe("ProductTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading", () => {
    render(
      <ProductTable
        products={[]}
        categories={mockCategories}
        canSeeCostPrice={true}
        canManageProducts={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onPageSizeChange={mockOnPageSizeChange}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        isLoading={true}
      />,
    );

    expect(screen.getByRole("table", { hidden: true })).toBeInTheDocument();
  });

  it("renders products when data provided", () => {
    render(
      <ProductTable
        products={mockProducts}
        categories={mockCategories}
        canSeeCostPrice={true}
        canManageProducts={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onPageSizeChange={mockOnPageSizeChange}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        isLoading={false}
      />,
    );

    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getByText("P-001")).toBeInTheDocument();
    expect(within(table).getByText("Widget")).toBeInTheDocument();
  });

  it("renders one row per product even with multiple variations (#592)", () => {
    const multiVariationProduct: Product = {
      ...mockProducts[0]!,
      id: "p2",
      imsCode: "RING-001",
      name: "Ring",
      variations: [
        { id: "rv1", productId: "p2", stockQuantity: 1 } as ProductVariation,
        { id: "rv2", productId: "p2", stockQuantity: 2 } as ProductVariation,
        { id: "rv3", productId: "p2", stockQuantity: 3 } as ProductVariation,
        { id: "rv4", productId: "p2", stockQuantity: 4 } as ProductVariation,
      ],
    };

    render(
      <ProductTable
        products={[multiVariationProduct]}
        categories={mockCategories}
        canSeeCostPrice={true}
        canManageProducts={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onPageSizeChange={mockOnPageSizeChange}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        isLoading={false}
      />,
    );

    const table = screen.getByRole("table", { hidden: true });
    // The product code must appear exactly once despite 4 variations.
    expect(within(table).getAllByText("RING-001")).toHaveLength(1);
    expect(within(table).getByText("4 variation(s)")).toBeInTheDocument();
  });

  it("lets long variation labels wrap instead of clipping in the detail drawer (#593)", () => {
    const longLabel = "Fabric / XL / Navy";
    const productWithLongVariation: Product = {
      ...mockProducts[0]!,
      id: "p3",
      imsCode: "RING-002",
      name: "Ring",
      variations: [
        {
          id: "lv1",
          productId: "p3",
          stockQuantity: 5,
          attributes: [
            { attributeValue: { value: "Fabric" } },
            { attributeValue: { value: "XL" } },
            { attributeValue: { value: "Navy" } },
          ],
        } as unknown as ProductVariation,
      ],
    };

    render(
      <ProductTable
        products={[productWithLongVariation]}
        categories={mockCategories}
        canSeeCostPrice={true}
        canManageProducts={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        pagination={mockPagination}
        onPageChange={mockOnPageChange}
        onPageSizeChange={mockOnPageSizeChange}
        searchQuery=""
        onSearchChange={mockOnSearchChange}
        isLoading={false}
      />,
    );

    // Open the variations detail drawer by clicking the product row.
    const table = screen.getByRole("table", { hidden: true });
    fireEvent.click(within(table).getByText("RING-002"));

    const label = screen.getByText(longLabel);
    const cell = label.closest("td");
    expect(cell).not.toBeNull();
    // The label cell must allow wrapping (no nowrap) so long combination
    // strings stay fully readable on narrow mobile containers.
    expect(cell!.className).toContain("whitespace-normal");
    expect(cell!.className).toContain("break-words");
    expect(cell!.className).not.toContain("whitespace-nowrap");
  });
});
