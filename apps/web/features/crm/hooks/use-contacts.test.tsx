import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetContacts = vi.fn();
const mockCreateContact = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/contact.service", () => ({
  getContacts: (...args: unknown[]) => mockGetContacts(...args),
  getContactById: vi.fn(),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  getContactTags: vi.fn(),
  createContactTag: vi.fn(),
  updateContactTag: vi.fn(),
  deleteContactTag: vi.fn(),
  addContactNote: vi.fn(),
  deleteContactNote: vi.fn(),
  addContactAttachment: vi.fn(),
  deleteContactAttachment: vi.fn(),
  addContactCommunication: vi.fn(),
  importContactsCsv: vi.fn(),
  exportContactsCsv: vi.fn(),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useContactsPaginated, useCreateContact } from "./use-contacts";

describe("useContactsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetContacts.mockResolvedValue({
      contacts: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getContacts with params", async () => {
    const { result } = renderHook(
      () => useContactsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetContacts).toHaveBeenCalled();
  });

  it("does not fetch contacts when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(
      () => useContactsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetContacts).not.toHaveBeenCalled();
  });
});

describe("useCreateContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateContact.mockResolvedValue({ id: "c1", name: "Contact 1" });
  });

  it("calls createContact on mutation", async () => {
    const createData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    };
    const { result } = renderHook(() => useCreateContact(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateContact).toHaveBeenCalledWith(createData);
  });
});
