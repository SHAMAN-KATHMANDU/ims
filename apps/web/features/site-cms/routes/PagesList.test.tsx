import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { TenantPageListItem } from "@/features/tenant-pages/services/tenant-pages.service";
import { PagesList } from "./PagesList";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/site-cms/hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

vi.mock("@/features/tenant-pages", () => ({
  useTenantPages: vi.fn(),
  useCreateTenantPage: vi.fn(),
  usePublishTenantPage: vi.fn(),
  useDeleteTenantPage: vi.fn(),
}));

import { useRouter } from "next/navigation";
import {
  useTenantPages,
  useCreateTenantPage,
  usePublishTenantPage,
  useDeleteTenantPage,
} from "@/features/tenant-pages";

const mockRouter = {
  push: vi.fn(),
};

const mockPages: TenantPageListItem[] = [
  {
    id: "page-1",
    tenantId: "tenant-1",
    slug: "home",
    title: "Home Page",
    layoutVariant: "default",
    showInNav: true,
    navOrder: 0,
    isPublished: true,
    reviewStatus: "PUBLISHED",
    seoTitle: "Home",
    seoDescription: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "page-2",
    tenantId: "tenant-1",
    slug: "about",
    title: "About Us",
    layoutVariant: "default",
    showInNav: true,
    navOrder: 1,
    isPublished: false,
    reviewStatus: "DRAFT",
    seoTitle: null,
    seoDescription: null,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-05-02T00:00:00Z",
  },
  {
    id: "page-3",
    tenantId: "tenant-1",
    slug: "contact",
    title: "Contact",
    layoutVariant: "default",
    showInNav: false,
    navOrder: 0,
    isPublished: false,
    reviewStatus: "IN_REVIEW",
    seoTitle: null,
    seoDescription: null,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-05-03T00:00:00Z",
  },
];

describe("PagesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (useTenantPages as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { pages: mockPages, total: 3, page: 1, limit: 100 },
      isLoading: false,
    });
    (useCreateTenantPage as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: "page-4" }),
    });
    (usePublishTenantPage as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });
    (useDeleteTenantPage as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });
  });

  it("renders all pages in the table", () => {
    render(<PagesList />);
    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("filters pages by status when tab is clicked", () => {
    render(<PagesList />);
    const tabs = screen.getAllByRole("tab");
    const publishedTab = tabs[1];
    if (publishedTab) {
      fireEvent.click(publishedTab);
      expect(screen.getByText("Home Page")).toBeInTheDocument();
      expect(screen.queryByText("About Us")).not.toBeInTheDocument();
    }
  });

  it("shows correct tab counts", () => {
    render(<PagesList />);
    expect(screen.getByText("All")).toBeInTheDocument();
    const allCountBadge = screen.getAllByText("3")[0];
    expect(allCountBadge).toBeInTheDocument();
  });

  it("filters pages by search query", () => {
    render(<PagesList />);
    const searchInput = screen.getByPlaceholderText("Filter pages…");
    fireEvent.change(searchInput, { target: { value: "about" } });
    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });

  it("shows bulk action bar when rows are selected", () => {
    render(<PagesList />);
    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes[1]) {
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    }
  });

  it("navigates to page when row is clicked", () => {
    render(<PagesList />);
    const rows = screen.getAllByText("Home Page");
    if (rows[0]) {
      fireEvent.click(rows[0]);
      expect(mockRouter.push).toHaveBeenCalledWith("pages/page-1");
    }
  });

  it("toggles select all checkbox", () => {
    render(<PagesList />);
    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByText("3 selected")).toBeInTheDocument();
    }
  });

  it("shows Homepage pill for home page", () => {
    render(<PagesList />);
    const homepagePill = screen.getByText("Homepage");
    expect(homepagePill).toBeInTheDocument();
  });

  it("displays correct status pills", () => {
    render(<PagesList />);
    const pills = screen.getAllByText("Published");
    const reviewPills = screen.getAllByText("In review");
    expect(pills.length).toBeGreaterThan(0);
    expect(reviewPills.length).toBeGreaterThan(0);
  });
});
