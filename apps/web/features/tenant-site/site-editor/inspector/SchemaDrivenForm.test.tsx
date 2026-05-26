import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { SchemaDrivenForm } from "./SchemaDrivenForm";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

vi.mock("@/features/tenant-pages", () => ({
  useTenantPages: () => ({ data: { pages: [] }, isLoading: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SchemaDrivenForm", () => {
  it("renders the component without error", () => {
    const onChange = vi.fn();
    const value = {};

    const { container } = renderWithProviders(
      <SchemaDrivenForm blockKind="hero" value={value} onChange={onChange} />,
    );

    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("shows no schema message for unknown block kind", () => {
    const onChange = vi.fn();

    renderWithProviders(
      <SchemaDrivenForm
        blockKind="unknown-block-kind"
        value={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByText(/No schema found for/)).toBeInTheDocument();
  });
});
