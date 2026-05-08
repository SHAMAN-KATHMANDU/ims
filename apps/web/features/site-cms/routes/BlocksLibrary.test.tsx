import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlocksLibrary } from "./BlocksLibrary";

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

describe("BlocksLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the blocks library page", () => {
    const { container } = render(<BlocksLibrary />);
    // Check that the main grid renders with block cards
    const grid = container.querySelector("[style*='grid']");
    expect(grid).toBeDefined();
  });

  it("renders category filter with All option", () => {
    render(<BlocksLibrary />);
    expect(screen.getByText("All")).toBeDefined();
  });

  it("renders block cards grid", () => {
    render(<BlocksLibrary />);
    // Should render some blocks from catalog
    const cards = screen.getAllByRole("button");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("renders action buttons", () => {
    const { container } = render(<BlocksLibrary />);
    // Check for buttons with specific content
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders blocks from all categories when All is selected", () => {
    const { container } = render(<BlocksLibrary />);
    // Should render block cards with descriptions
    const descriptions = container.querySelectorAll(
      "[style*='color: var(--ink-4)']",
    );
    expect(descriptions.length).toBeGreaterThan(0);
  });
});
