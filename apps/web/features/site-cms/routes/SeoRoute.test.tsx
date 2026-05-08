import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { SeoRoute } from "./SeoRoute";

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

vi.mock("../hooks/use-redirects", () => ({
  useRedirects: vi.fn(),
  useCreateRedirect: vi.fn(),
  useUpdateRedirect: vi.fn(),
  useDeleteRedirect: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import {
  useRedirects,
  useCreateRedirect,
  useUpdateRedirect,
  useDeleteRedirect,
} from "../hooks/use-redirects";
import type { Redirect } from "../services/redirects.service";

const mockUseSetBreadcrumbs = useSetBreadcrumbs as ReturnType<typeof vi.fn>;
const mockUseRedirects = useRedirects as ReturnType<typeof vi.fn>;
const mockUseCreateRedirect = useCreateRedirect as ReturnType<typeof vi.fn>;
const mockUseUpdateRedirect = useUpdateRedirect as ReturnType<typeof vi.fn>;
const mockUseDeleteRedirect = useDeleteRedirect as ReturnType<typeof vi.fn>;

const mockRedirects: Redirect[] = [
  {
    id: "r1",
    tenantId: "t1",
    fromPath: "/old-menu",
    toPath: "/menus/dinner",
    statusCode: 301,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "r2",
    tenantId: "t1",
    fromPath: "/old-wine",
    toPath: "/menus/wine",
    statusCode: 302,
    isActive: true,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("SeoRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSetBreadcrumbs.mockReturnValue(undefined);
    mockUseRedirects.mockReturnValue({
      data: mockRedirects,
      isLoading: false,
      error: null,
    });
    mockUseCreateRedirect.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
    mockUseUpdateRedirect.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
    mockUseDeleteRedirect.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
  });

  it("renders the page header", () => {
    render(<SeoRoute />, { wrapper: Wrapper });
    expect(screen.getByText("SEO & redirects")).toBeInTheDocument();
    expect(
      screen.getByText("Meta defaults, sitemap, robots, and URL redirects."),
    ).toBeInTheDocument();
  });

  it("sets breadcrumbs on mount", () => {
    render(<SeoRoute />, { wrapper: Wrapper });
    expect(mockUseSetBreadcrumbs).toHaveBeenCalledWith([
      "Site",
      "SEO & Redirects",
    ]);
  });

  describe("Redirects tab", () => {
    it("renders redirects table with rows", () => {
      render(<SeoRoute />, { wrapper: Wrapper });
      expect(screen.getByText("/old-menu")).toBeInTheDocument();
      expect(screen.getByText("/menus/dinner")).toBeInTheDocument();
      expect(screen.getByText("/old-wine")).toBeInTheDocument();
      expect(screen.getByText("/menus/wine")).toBeInTheDocument();
    });

    it("displays status code badges (301 vs 302)", () => {
      render(<SeoRoute />, { wrapper: Wrapper });
      const badges = screen.getAllByText(/301|302/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it("filters redirects by search query", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const searchInput = screen.getByPlaceholderText(
        "Search redirects…",
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "wine" } });

      expect(screen.getByText("/old-wine")).toBeInTheDocument();
      expect(screen.queryByText("/old-menu")).not.toBeInTheDocument();
    });

    it("clears search and shows all redirects", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const searchInput = screen.getByPlaceholderText(
        "Search redirects…",
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "wine" } });
      expect(screen.queryByText("/old-menu")).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("/old-menu")).toBeInTheDocument();
      expect(screen.getByText("/old-wine")).toBeInTheDocument();
    });
  });

  describe("Dialog", () => {
    it("has a new redirect button", () => {
      render(<SeoRoute />, { wrapper: Wrapper });
      const newBtn = screen.getByRole("button", { name: /new redirect/i });
      expect(newBtn).toBeInTheDocument();
    });

    it("has import csv button", () => {
      render(<SeoRoute />, { wrapper: Wrapper });
      const importBtn = screen.getByRole("button", { name: /import csv/i });
      expect(importBtn).toBeInTheDocument();
    });
  });

  describe("Tabs", () => {
    it("renders all four tabs", () => {
      render(<SeoRoute />, { wrapper: Wrapper });
      expect(screen.getByText("Redirects")).toBeInTheDocument();
      expect(screen.getByText("Meta defaults")).toBeInTheDocument();
      expect(screen.getByText("Sitemap & robots")).toBeInTheDocument();
      expect(screen.getByText("Social cards")).toBeInTheDocument();
    });

    it("switches to Meta defaults tab and shows 'Coming soon' badge", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const metaTab = screen.getByRole("button", { name: /meta defaults/i });
      fireEvent.click(metaTab);

      expect(screen.getByText("Coming soon")).toBeInTheDocument();
    });

    it("switches to Sitemap & robots tab and shows code blocks", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const sitemapTab = screen.getByRole("button", {
        name: /sitemap & robots/i,
      });
      fireEvent.click(sitemapTab);

      expect(screen.getByText("sitemap.xml")).toBeInTheDocument();
      expect(screen.getByText("robots.txt")).toBeInTheDocument();
      const messages = screen.getAllByText("Auto-generated by the renderer.");
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });

    it("switches to Social cards tab and shows 'Coming soon' badge", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const socialTab = screen.getByRole("button", { name: /social cards/i });
      fireEvent.click(socialTab);

      const comingSoonBadges = screen.getAllByText("Coming soon");
      expect(comingSoonBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Loading state", () => {
    it("shows loading indicator when fetching redirects", () => {
      mockUseRedirects.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      render(<SeoRoute />, { wrapper: Wrapper });
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty message when no redirects", () => {
      mockUseRedirects.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<SeoRoute />, { wrapper: Wrapper });
      expect(screen.getByText("No redirects yet.")).toBeInTheDocument();
    });

    it("shows no results message when search has no matches", () => {
      render(<SeoRoute />, { wrapper: Wrapper });

      const searchInput = screen.getByPlaceholderText(
        "Search redirects…",
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "xyz-nonexistent" } });

      expect(
        screen.getByText("No redirects match your search."),
      ).toBeInTheDocument();
    });
  });
});
