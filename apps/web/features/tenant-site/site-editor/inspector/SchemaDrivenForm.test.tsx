import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchemaDrivenForm } from "./SchemaDrivenForm";

describe("SchemaDrivenForm", () => {
  it("renders the component without error", () => {
    const onChange = vi.fn();
    const value = {};

    const { container } = render(
      <SchemaDrivenForm blockKind="hero" value={value} onChange={onChange} />,
    );

    // Just verify the component rendered something
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("shows no schema message for unknown block kind", () => {
    const onChange = vi.fn();

    render(
      <SchemaDrivenForm
        blockKind="unknown-block-kind"
        value={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/No schema found for/)).toBeInTheDocument();
  });
});
