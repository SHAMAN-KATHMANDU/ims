import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetVendors = vi.fn();
const mockCreateVendor = vi.fn();

vi.mock("../services/vendor.service", () => ({
  getVendors: (...args: unknown[]) => mockGetVendors(...args),
  getVendorById: vi.fn(),
  getVendorProducts: vi.fn(),
  createVendor: (...args: unknown[]) => mockCreateVendor(...args),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useVendorsPaginated, useCreateVendor } from "./use-vendors";

describe("useVendorsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVendors.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getVendors with normalized params", async () => {
    const { result } = renderHook(
      () => useVendorsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetVendors).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreateVendor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateVendor.mockResolvedValue({ id: "v1", name: "Vendor 1" });
  });

  it("calls createVendor on mutation", async () => {
    const createData = { name: "Vendor A", email: "vendor@example.com" };
    const { result } = renderHook(() => useCreateVendor(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateVendor).toHaveBeenCalledWith(createData);
  });
});
