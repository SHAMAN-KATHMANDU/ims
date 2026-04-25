import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetMyBusinessProfile = vi.fn();
const mockUpdateMyBusinessProfile = vi.fn();

vi.mock("../services/business-profile.service", () => ({
  getMyBusinessProfile: () => mockGetMyBusinessProfile(),
  updateMyBusinessProfile: (...args: unknown[]) =>
    mockUpdateMyBusinessProfile(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientWrapper, null, children);

import {
  useMyBusinessProfile,
  useUpdateMyBusinessProfile,
} from "./use-business-profile";

const MOCK_PROFILE = {
  id: "bp1",
  tenantId: "t1",
  legalName: "Acme Pvt. Ltd.",
  displayName: "Acme Store",
  tagline: null,
  logoUrl: null,
  faviconUrl: null,
  email: "hello@acme.com",
  phone: null,
  alternatePhone: null,
  websiteUrl: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  mapUrl: null,
  panNumber: null,
  vatNumber: null,
  registrationNumber: null,
  taxId: null,
  defaultCurrency: "NPR",
  timezone: "Asia/Kathmandu",
  socials: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("useMyBusinessProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyBusinessProfile.mockResolvedValue({ profile: MOCK_PROFILE });
  });

  it("calls getMyBusinessProfile and returns data", async () => {
    const { result } = renderHook(() => useMyBusinessProfile(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetMyBusinessProfile).toHaveBeenCalledTimes(1);
    expect(result.current.data?.profile.legalName).toBe("Acme Pvt. Ltd.");
  });
});

describe("useUpdateMyBusinessProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyBusinessProfile.mockResolvedValue({ profile: MOCK_PROFILE });
    mockUpdateMyBusinessProfile.mockResolvedValue({ profile: MOCK_PROFILE });
  });

  it("calls updateMyBusinessProfile on mutation", async () => {
    const updateData = { displayName: "Acme Store Updated" };
    const { result } = renderHook(() => useUpdateMyBusinessProfile(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(updateData);
    });

    expect(mockUpdateMyBusinessProfile).toHaveBeenCalledWith(updateData);
  });
});
