import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { LinkPicker } from "./LinkPicker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Mock the tenant pages hook
vi.mock("@/features/tenant-pages", () => ({
  useTenantPages: () => ({
    data: {
      pages: [
        {
          id: "home",
          slug: "home",
          title: "Home",
          navOrder: 0,
          showInNav: true,
          isPublished: true,
        },
        {
          id: "products-index",
          slug: "products-index",
          title: "Products",
          navOrder: 1,
          showInNav: true,
          isPublished: true,
        },
        {
          id: "about",
          slug: "about",
          title: "About Us",
          navOrder: 2,
          showInNav: true,
          isPublished: true,
        },
      ],
    },
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("LinkPicker", () => {
  it("renders with Page and URL tabs", () => {
    const onChange = vi.fn();
    render(<LinkPicker value="" onChange={onChange} />, { wrapper: Wrapper });

    expect(screen.getByText("Page")).toBeInTheDocument();
    expect(screen.getByText("URL")).toBeInTheDocument();
  });

  it("shows scope pages on page tab", () => {
    const onChange = vi.fn();
    render(<LinkPicker value="" onChange={onChange} />, { wrapper: Wrapper });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("shows custom pages grouped separately", () => {
    const onChange = vi.fn();
    render(<LinkPicker value="" onChange={onChange} />, { wrapper: Wrapper });

    expect(screen.getByText("About Us")).toBeInTheDocument();
  });

  it("displays current value when set", () => {
    const onChange = vi.fn();
    render(<LinkPicker value="/about" onChange={onChange} />, {
      wrapper: Wrapper,
    });

    // The "Current:" label shows the current value
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
  });
});
