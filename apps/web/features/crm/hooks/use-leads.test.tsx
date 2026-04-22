import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetLeads = vi.fn();
const mockCreateLead = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/lead.service", () => ({
  getLeads: (...args: unknown[]) => mockGetLeads(...args),
  getLeadById: vi.fn(),
  createLead: (...args: unknown[]) => mockCreateLead(...args),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  convertLead: vi.fn(),
  assignLead: vi.fn(),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useLeadsPaginated, useCreateLead } from "./use-leads";

describe("useLeadsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetLeads.mockResolvedValue({
      leads: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getLeads with params", async () => {
    const { result } = renderHook(
      () => useLeadsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetLeads).toHaveBeenCalled();
  });

  it("does not fetch leads when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(
      () => useLeadsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetLeads).not.toHaveBeenCalled();
  });
});

describe("useCreateLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateLead.mockResolvedValue({ id: "l1", name: "Lead 1" });
  });

  it("calls createLead on mutation", async () => {
    const createData = { name: "New Lead", email: "lead@example.com" };
    const { result } = renderHook(() => useCreateLead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateLead).toHaveBeenCalledWith(createData);
  });
});
