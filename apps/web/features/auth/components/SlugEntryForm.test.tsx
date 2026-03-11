import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("shows error when submitting empty", () => {
    render(<SlugEntryForm />);

    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    expect(
      screen.getByText(/enter your organization slug/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows error for invalid slug format", () => {
    render(<SlugEntryForm />);

    fireEvent.change(
      screen.getByRole("textbox", { name: /organization slug/i }),
      { target: { value: "invalid slug!" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    expect(
      screen.getByText(/use only letters, numbers, and hyphens/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to login path on valid slug", () => {
    render(<SlugEntryForm />);

    fireEvent.change(
      screen.getByRole("textbox", { name: /organization slug/i }),
      { target: { value: "my-org" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    expect(mockPush).toHaveBeenCalledWith("/my-org/login");
  });
});
