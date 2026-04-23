import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockOnSubmit = vi.fn();
const mockOnOpenChange = vi.fn();

vi.mock("@/lib/phone", () => ({
  parseAndValidatePhone: (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      return { valid: true, e164: `+977${digits.slice(-10)}` };
    }
    return { valid: false, error: "Invalid phone number" };
  },
  parseE164ToCountryAndNational: (e164: string) => {
    if (!e164?.startsWith("+977")) return null;
    return {
      country: "NP" as const,
      nationalNumber: e164.slice(4),
    };
  },
  getCountries: () => ["NP"],
  getCountryCallingCode: () => "977",
}));

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

    render(
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

    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    await waitFor(
      () => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "John Doe",
          }),
        );
        const firstArg = mockOnSubmit.mock.calls[0]?.[0] as
          | { phone?: string }
          | undefined;
        expect(firstArg?.phone).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
