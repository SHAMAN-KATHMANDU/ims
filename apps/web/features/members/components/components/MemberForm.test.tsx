import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockOnSubmit = vi.fn();
const mockOnOpenChange = vi.fn();

import { MemberForm } from "./MemberForm";

describe("MemberForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields when inline", () => {
    render(
      <MemberForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        inline={true}
      />,
    );

    expect(screen.getByText("Add New Member")).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("calls onSubmit with phone and optional fields when valid", async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    const { container } = render(
      <MemberForm
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        inline={true}
      />,
    );

    const phoneInput = screen.getByPlaceholderText(/9841234567/i);
    fireEvent.change(phoneInput, { target: { value: "9841234567" } });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "John Doe" },
    });

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();
    if (!form) throw new Error("Form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "John Doe",
        }),
      );
      const firstArg = mockOnSubmit.mock.calls[0]?.[0] as
        | { phone?: string }
        | undefined;
      expect(firstArg?.phone).toBeTruthy();
    });
  });
});
