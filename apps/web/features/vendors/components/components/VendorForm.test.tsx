import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/phone", () => ({
  parseAndValidatePhone: () => ({ valid: false, error: "Invalid" }),
  parseE164ToCountryAndNational: () => null,
  getCountries: () => ["NP"],
  getCountryCallingCode: () => "977",
}));

import { VendorForm } from "./VendorForm";

const mockOnSubmit = vi.fn();
const mockOnOpenChange = vi.fn();
const mockOnReset = vi.fn();

describe("VendorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields when inline", () => {
    render(
      <VendorForm
        open={true}
        onOpenChange={mockOnOpenChange}
        editingVendor={null}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        inline={true}
      />,
    );

    expect(screen.getByPlaceholderText("Vendor name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Contact person name or email"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 9841234567")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Vendor address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create vendor/i }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with form data when valid", async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <VendorForm
        open={true}
        onOpenChange={mockOnOpenChange}
        editingVendor={null}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        inline={true}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Vendor name"), {
      target: { value: "Acme Supplies" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Contact person name or email"),
      { target: { value: "John Doe" } },
    );

    fireEvent.click(screen.getByRole("button", { name: /create vendor/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Acme Supplies",
          contact: "John Doe",
        }),
      );
    });
  });

  it("shows edit vendor when editingVendor provided", () => {
    render(
      <VendorForm
        open={true}
        onOpenChange={mockOnOpenChange}
        editingVendor={{
          id: "v1",
          name: "Existing Vendor",
          contact: "Jane",
          phone: "9841111111",
          address: "123 St",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        }}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        inline={true}
      />,
    );

    expect(screen.getByDisplayValue("Existing Vendor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });
});
