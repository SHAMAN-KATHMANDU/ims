import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BlogList } from "./BlogList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

vi.mock("@/features/tenant-blog", () => ({
  useBlogPosts: vi.fn(),
  useCreateBlogPost: vi.fn(),
}));

import * as tenantBlogModule from "@/features/tenant-blog";

const mockPosts = [
  {
    id: "post-1",
    title: "Published Post",
    slug: "published-post",
    status: "PUBLISHED" as const,
    tenantId: "tenant-1",
    excerpt: null,
    heroImageUrl: null,
    authorName: "Author One",
    publishedAt: new Date().toISOString(),
    categoryId: "cat-1",
    tags: [],
    readingMinutes: 5,
    seoTitle: null,
    seoDescription: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: "cat-1", slug: "tech", name: "Technology" },
  },
  {
    id: "post-2",
    title: "Draft Post",
    slug: "draft-post",
    status: "DRAFT" as const,
    tenantId: "tenant-1",
    excerpt: null,
    heroImageUrl: null,
    authorName: "Author Two",
    publishedAt: null,
    categoryId: null,
    tags: [],
    readingMinutes: 3,
    seoTitle: null,
    seoDescription: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: null,
  },
  {
    id: "post-3",
    title: "In Review Post",
    slug: "in-review-post",
    status: "DRAFT" as const,
    reviewStatus: "IN_REVIEW" as const,
    tenantId: "tenant-1",
    excerpt: null,
    heroImageUrl: null,
    authorName: "Author Three",
    publishedAt: null,
    categoryId: null,
    tags: [],
    readingMinutes: 2,
    seoTitle: null,
    seoDescription: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: null,
  },
];

describe("BlogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantBlogModule.useBlogPosts as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        data: { posts: mockPosts, total: 3, page: 1, limit: 20 },
        isLoading: false,
      },
    );
    (
      tenantBlogModule.useCreateBlogPost as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it("renders blog list with posts", async () => {
    render(<BlogList />);
    await waitFor(() => {
      expect(screen.getByText("Published Post")).toBeInTheDocument();
      expect(screen.getByText("Draft Post")).toBeInTheDocument();
      expect(screen.getByText("In Review Post")).toBeInTheDocument();
    });
  });

  it("displays filter tabs with counts", async () => {
    render(<BlogList />);
    await waitFor(() => {
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThanOrEqual(5); // All, Published, Drafts, In review, Scheduled
      expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /drafts/i })).toBeInTheDocument();
    });
  });

  it("displays category names in table", async () => {
    render(<BlogList />);
    await waitFor(() => {
      expect(screen.getByText("Technology")).toBeInTheDocument();
    });
  });

  it("displays author names", async () => {
    render(<BlogList />);
    await waitFor(() => {
      expect(screen.getByText("Author One")).toBeInTheDocument();
      expect(screen.getByText("Author Two")).toBeInTheDocument();
    });
  });

  it("renders view mode toggle buttons", async () => {
    render(<BlogList />);
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it("registers Write post and Import buttons in the topbar via breadcrumbs", async () => {
    const { useSetBreadcrumbs } = await import("../hooks/use-breadcrumbs");
    const setBreadcrumbsMock = vi.mocked(useSetBreadcrumbs);
    render(<BlogList />);
    await waitFor(() => {
      expect(setBreadcrumbsMock).toHaveBeenCalled();
    });
    // The right slot is a ReactNode; assert the call carried it.
    const lastCall = setBreadcrumbsMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual(["Site", "Blog"]);
    expect(lastCall?.[1]?.right).toBeTruthy();
  });
});
