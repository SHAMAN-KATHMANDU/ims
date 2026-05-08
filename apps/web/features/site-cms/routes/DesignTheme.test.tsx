import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DesignTheme } from "./DesignTheme";

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

describe("DesignTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the design theme page", () => {
    render(<DesignTheme />);
    expect(screen.getByText(/Color palette/i)).toBeDefined();
  });

  it("renders color tokens", () => {
    const { container: dom } = render(<DesignTheme />);
    expect(screen.getByText(/Background/i)).toBeDefined();
    expect(screen.getByText(/Ink primary/i)).toBeDefined();
    // Verify we have color token divs with --accent, --bg, etc.
    expect(dom.innerHTML).toContain("--bg");
    expect(dom.innerHTML).toContain("--accent");
  });

  it("renders typography section", () => {
    render(<DesignTheme />);
    expect(screen.getByText(/Typography/i)).toBeDefined();
    expect(screen.getByText(/Tiempos/i)).toBeDefined();
    expect(screen.getByText(/Söhne/i)).toBeDefined();
    expect(screen.getByText(/JetBrains Mono/i)).toBeDefined();
  });

  it("renders layout controls", () => {
    render(<DesignTheme />);
    expect(screen.getByText(/Layout/i)).toBeDefined();
    expect(screen.getByText(/Container width/i)).toBeDefined();
    expect(screen.getByText(/Section spacing/i)).toBeDefined();
    expect(screen.getByText(/Border radius/i)).toBeDefined();
  });

  it("renders live theme preview", () => {
    render(<DesignTheme />);
    expect(screen.getByText(/Live theme preview/i)).toBeDefined();
    expect(
      screen.getByText(/A short reading on the long heat of almond wood/i),
    ).toBeDefined();
  });
});
