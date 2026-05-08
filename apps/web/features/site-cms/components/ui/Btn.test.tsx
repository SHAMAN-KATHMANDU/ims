import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Btn } from "./Btn";

describe("Btn", () => {
  it("renders with default variant", () => {
    render(<Btn>Click me</Btn>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders with primary variant", () => {
    render(<Btn variant="primary">Primary</Btn>);
    const btn = screen.getByText("Primary");
    expect(btn).toBeInTheDocument();
  });

  it("renders with accent variant", () => {
    render(<Btn variant="accent">Accent</Btn>);
    const btn = screen.getByText("Accent");
    expect(btn).toBeInTheDocument();
  });

  it("renders with danger variant", () => {
    render(<Btn variant="danger">Delete</Btn>);
    const btn = screen.getByText("Delete");
    expect(btn).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Btn onClick={handleClick}>Click</Btn>);
    const btn = screen.getByText("Click");
    btn.click();
    expect(handleClick).toHaveBeenCalled();
  });

  it("renders with active state", () => {
    render(
      <Btn variant="ghost" active>
        Active
      </Btn>,
    );
    const btn = screen.getByText("Active");
    expect(btn).toBeInTheDocument();
  });
});
