import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pill } from "./Pill";

describe("Pill", () => {
  it("renders with default tone", () => {
    render(<Pill>Test</Pill>);
    const pill = screen.getByText("Test");
    expect(pill).toBeInTheDocument();
  });

  it("renders with success tone", () => {
    render(<Pill tone="success">Success</Pill>);
    const pill = screen.getByText("Success");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveStyle({ color: "var(--success)" });
  });

  it("renders with mono class when mono=true", () => {
    const { container } = render(<Pill mono>Mono Text</Pill>);
    const span = container.querySelector(".mono");
    expect(span).toBeInTheDocument();
  });
});
