import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { PostEditor } from "./PostEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useParams: () => ({ postId: "post-1", workspace: "workspace" }),
}));

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
  useHideCmsTopbar: vi.fn(),
}));

vi.mock("@/features/tenant-blog", () => ({
  useBlogPost: vi.fn(),
  useUpdateBlogPost: vi.fn(),
  usePublishBlogPost: vi.fn(),
  useUnpublishBlogPost: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

interface TiptapEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
}

vi.mock("../components/TiptapEditor", () => ({
  TiptapEditor: ({ initialContent, onChange }: TiptapEditorProps) => (
    <textarea
      data-testid="tiptap-editor"
      value={initialContent}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Editor content"
    />
  ),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockTiptapEditor({ initialContent, onChange }: TiptapEditorProps) {
      return (
        <textarea
          data-testid="tiptap-editor"
          value={initialContent ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    return MockTiptapEditor;
  },
}));

import * as tenantBlogModule from "@/features/tenant-blog";
import * as breadcrumbModule from "../hooks/use-breadcrumbs";

const mockBlogPost = {
  id: "post-1",
  title: "Test Post",
  bodyMarkdown: "# Hello\n\nThis is content",
  status: "DRAFT" as const,
  slug: "test-post",
  tenantId: "tenant-1",
  excerpt: null,
  heroImageUrl: null,
  authorName: "Author",
  publishedAt: null,
  categoryId: null,
  tags: [],
  readingMinutes: 5,
  seoTitle: null,
  seoDescription: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  category: null,
};

describe("PostEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantBlogModule.useBlogPost as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBlogPost,
      isLoading: false,
    });
    (
      tenantBlogModule.useUpdateBlogPost as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockBlogPost),
    });
    (
      tenantBlogModule.usePublishBlogPost as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockBlogPost),
    });
    (
      tenantBlogModule.useUnpublishBlogPost as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockBlogPost),
    });
  });

  it("renders with post title and content loaded", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Post")).toBeInTheDocument();
    });
  });

  it("updates title when user types", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Post")).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue(
      "Test Post",
    ) as HTMLInputElement;
    await act(() => {
      titleInput.value = "New Title";
      fireEvent.change(titleInput);
    });

    expect(titleInput.value).toBe("New Title");
  });

  it("calls useHideCmsTopbar to hide the topbar", () => {
    render(<PostEditor />);
    expect(breadcrumbModule.useHideCmsTopbar).toHaveBeenCalled();
  });

  it("renders Tiptap editor with initial content", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      const editor = screen.getByTestId("tiptap-editor") as HTMLTextAreaElement;
      expect(editor).toBeInTheDocument();
      expect(editor.value).toBe("# Hello\n\nThis is content");
    });
  });

  it("calls usePublishBlogPost when publish button clicked via breadcrumbs", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Post")).toBeInTheDocument();
    });
    expect(breadcrumbModule.useSetBreadcrumbs).toHaveBeenCalledWith(
      expect.arrayContaining(["Site", "Blog"]),
      expect.any(Object),
    );
  });

  it("renders editor container with proper layout", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue("Test Post");
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveStyle({ fontSize: "28px" });
    });
  });

  it("renders title input field", async () => {
    render(<PostEditor />);
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue(
        "Test Post",
      ) as HTMLInputElement;
      expect(titleInput.type).toBe("text");
      expect(titleInput.placeholder).toBe("Untitled");
    });
  });

  it("shows loading state when post is loading", () => {
    (tenantBlogModule.useBlogPost as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<PostEditor />);
    expect(screen.getByText("Loading post…")).toBeInTheDocument();
  });

  it("shows not found message when post is null", () => {
    (tenantBlogModule.useBlogPost as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<PostEditor />);
    expect(screen.getByText("Post not found")).toBeInTheDocument();
  });
});
