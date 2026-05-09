import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { TemplatesView } from "./TemplatesView";

// Mock all external dependencies
vi.mock("../hooks/use-templates");
vi.mock("../../hooks/use-tenant-site");
vi.mock("next/navigation");
vi.mock("@/hooks/useToast");

// Import mocks after mocking
import * as useTemplatesHook from "../hooks/use-templates";
import * as useTenantSiteHook from "../../hooks/use-tenant-site";

const createQueryClient = () => new QueryClient();

const mockTemplates = [
  {
    id: "1",
    slug: "blank",
    name: "Blank",
    description: "Start with a blank canvas",
    category: null,
    previewImageUrl: null,
    defaultBranding: null,
    defaultSections: null,
    defaultPages: null,
    isActive: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    slug: "auric",
    name: "Auric",
    description: "Warm and elegant design",
    category: null,
    previewImageUrl: null,
    defaultBranding: null,
    defaultSections: null,
    defaultPages: null,
    isActive: true,
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("TemplatesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(useTemplatesHook.useTemplatesQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      status: "pending",
    } as unknown as ReturnType<typeof useTemplatesHook.useTemplatesQuery>);

    vi.mocked(useTenantSiteHook.useSiteConfig).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      status: "pending",
    } as unknown as ReturnType<typeof useTenantSiteHook.useSiteConfig>);

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesView />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading templates...")).toBeInTheDocument();
  });

  it("renders all templates as cards", () => {
    vi.mocked(useTemplatesHook.useTemplatesQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTemplatesHook.useTemplatesQuery>);

    vi.mocked(useTenantSiteHook.useSiteConfig).mockReturnValue({
      data: {
        id: "config-1",
        tenantId: "t1",
        websiteEnabled: true,
        templateId: "1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        themeTokens: null,
        isPublished: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        template: mockTemplates[0],
      },
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTenantSiteHook.useSiteConfig>);

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesView />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Blank")).toBeInTheDocument();
    const auricElements = screen.queryAllByText("Auric");
    expect(auricElements.length).toBeGreaterThan(0);
    expect(screen.queryByText("Start with a blank canvas")).toBeInTheDocument();
    expect(screen.queryByText("Warm and elegant design")).toBeInTheDocument();
  });

  it("shows Current badge for active template", async () => {
    vi.mocked(useTemplatesHook.useTemplatesQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTemplatesHook.useTemplatesQuery>);

    vi.mocked(useTenantSiteHook.useSiteConfig).mockReturnValue({
      data: {
        id: "config-1",
        tenantId: "t1",
        websiteEnabled: true,
        templateId: "1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        themeTokens: null,
        isPublished: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        template: mockTemplates[0],
      },
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTenantSiteHook.useSiteConfig>);

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesView />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const currentBadges = screen.getAllByText("Current");
      expect(currentBadges.length).toBeGreaterThan(0);
    });
  });

  it("displays template descriptions", async () => {
    vi.mocked(useTemplatesHook.useTemplatesQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTemplatesHook.useTemplatesQuery>);

    vi.mocked(useTenantSiteHook.useSiteConfig).mockReturnValue({
      data: {
        id: "config-1",
        tenantId: "t1",
        websiteEnabled: true,
        templateId: "1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        themeTokens: null,
        isPublished: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        template: mockTemplates[0],
      },
      isLoading: false,
      error: null,
      isError: false,
      status: "success",
    } as unknown as ReturnType<typeof useTenantSiteHook.useSiteConfig>);

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesView />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Start with a blank canvas")).toBeInTheDocument();
      expect(screen.getByText("Warm and elegant design")).toBeInTheDocument();
    });
  });
});
