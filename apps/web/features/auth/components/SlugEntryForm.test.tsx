import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { SlugEntryForm } from "./SlugEntryForm";

describe("SlugEntryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and submit button", () => {
    render(<SlugEntryForm />);

    expect(
      screen.getByRole("textbox", { name: /organization slug/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^go$/i })).toBeInTheDocument();
  });

  it("shows error when submitting empty", async () => {
    render(<SlugEntryForm />);

    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/enter your organization slug/i),
      ).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error for invalid slug format", async () => {
    render(<SlugEntryForm />);

    const input = screen.getByRole("textbox", { name: /organization slug/i });
    fireEvent.change(input, { target: { value: "invalid slug!" } });
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/use only letters, numbers, and hyphens/i),
      ).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to login path on valid slug", async () => {
    render(<SlugEntryForm />);

    const input = screen.getByRole("textbox", { name: /organization slug/i });
    fireEvent.change(input, { target: { value: "my-org" } });
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/my-org/login");
    });
  });
});
