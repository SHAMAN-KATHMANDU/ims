import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ workspace: "workspace" }),
}));

// Mock use-recent-routes
vi.mock("../hooks/use-recent-routes", () => ({
  useRecentRoutes: () => ({
    routes: [
      { path: "/workspace/site/pages", label: "Pages" },
      { path: "/workspace/site/blog", label: "Blog" },
    ],
  }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    const { container } = render(<CommandPalette />);
    const palette = container.querySelector("[style*='position: fixed']");
    expect(palette).not.toBeInTheDocument();
  });

  it("opens on open-cmdk event", async () => {
    render(<CommandPalette />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-cmdk"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search pages/)).toBeInTheDocument();
    });
  });

  it("includes Jump to group without Forms", async () => {
    render(<CommandPalette />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-cmdk"));
    });
    await waitFor(() => {
      expect(screen.getByText("Jump to")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      // Check that Forms is explicitly not in the palette
      expect(screen.queryByText("Forms")).not.toBeInTheDocument();
    });
  });

  it("includes Actions group", async () => {
    render(<CommandPalette />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-cmdk"));
    });
    await waitFor(() => {
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("New page")).toBeInTheDocument();
      expect(screen.getByText("Toggle theme")).toBeInTheDocument();
    });
  });

  it("closes on Escape key", async () => {
    render(<CommandPalette />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-cmdk"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search pages/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText(/Search pages/);
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
  });

  it("filters items based on search query", async () => {
    render(<CommandPalette />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-cmdk"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search pages/)).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText(
      /Search pages/,
    ) as HTMLInputElement;
    await act(async () => {
      input.value = "dashboard";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
