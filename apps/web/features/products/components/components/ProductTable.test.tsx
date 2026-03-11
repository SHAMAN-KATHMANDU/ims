import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

    expect(screen.getByRole("table")).toBeInTheDocument();
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

    expect(screen.getByText("P-001")).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });
});
