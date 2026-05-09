import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MediaPicker } from "./MediaPicker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Mock the media hook
vi.mock("@/features/tenant-site/media/use-media", () => ({
  useMediaList: () => ({
    data: [
      {
        id: "1",
        url: "/media/image.jpg",
        name: "image.jpg",
        altText: "Test image",
        mimeType: "image/jpeg",
        width: 1000,
        height: 800,
        size: 50000,
      },
    ],
  }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("MediaPicker", () => {
  it("renders with a Pick button when no value", () => {
    const onChange = vi.fn();
    render(<MediaPicker value="" onChange={onChange} />, { wrapper: Wrapper });

    expect(screen.getByText("Pick from library")).toBeInTheDocument();
  });

  it("renders with a Change button when value is set", () => {
    const onChange = vi.fn();
    render(<MediaPicker value="/media/image.jpg" onChange={onChange} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText("Change")).toBeInTheDocument();
  });

  it("renders a Clear button when value is set", () => {
    const onChange = vi.fn();
    render(<MediaPicker value="/media/image.jpg" onChange={onChange} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText("Clear")).toBeInTheDocument();
  });
});
