import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Topbar } from "./Topbar";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";

vi.mock("../hooks/use-breadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
  BreadcrumbsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useSetBreadcrumbs: vi.fn(),
  useHideCmsTopbar: vi.fn(),
}));

const mockedUseBreadcrumbs = vi.mocked(useBreadcrumbs);

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseBreadcrumbs.mockReturnValue({
      crumbs: ["Site", "Pages"],
      subline: undefined,
      right: null,
      hidden: false,
      setCrumbs: vi.fn(),
    });
  });

  it("renders breadcrumbs from context", () => {
    render(<Topbar />);
    expect(screen.getByText("Site")).toBeInTheDocument();
    expect(screen.getByText("Pages")).toBeInTheDocument();
  });

  it("renders with dividers between crumbs", () => {
    const { container } = render(<Topbar />);
    const dividers = container.querySelectorAll("span");
    const slashDivider = Array.from(dividers).find(
      (el) => el.textContent === "/",
    );
    expect(slashDivider).toBeInTheDocument();
  });

  it("renders bell button", () => {
    render(<Topbar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders Live site button", () => {
    render(<Topbar />);
    expect(screen.getByText("Live site")).toBeInTheDocument();
  });

  it("renders subline when provided", () => {
    mockedUseBreadcrumbs.mockReturnValue({
      crumbs: ["Site"],
      subline: "edited 2m ago",
      right: null,
      setCrumbs: vi.fn(),
    });
    render(<Topbar />);
    expect(screen.getByText("edited 2m ago")).toBeInTheDocument();
  });
});
