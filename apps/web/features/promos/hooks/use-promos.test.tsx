import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetPromos = vi.fn();
const mockCreatePromo = vi.fn();

vi.mock("../services/promo.service", () => ({
  getPromos: (...args: unknown[]) => mockGetPromos(...args),
  getPromoById: vi.fn(),
  createPromo: (...args: unknown[]) => mockCreatePromo(...args),
  updatePromo: vi.fn(),
  deletePromo: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { usePromosPaginated, useCreatePromo } from "./use-promos";

describe("usePromosPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPromos.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getPromos with normalized params", async () => {
    const { result } = renderHook(
      () => usePromosPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetPromos).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreatePromo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePromo.mockResolvedValue({ id: "pr1", code: "SAVE10" });
  });

  it("calls createPromo on mutation", async () => {
    const createData = {
      code: "SAVE10",
      valueType: "PERCENTAGE" as const,
      value: 10,
    };
    const { result } = renderHook(() => useCreatePromo(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreatePromo).toHaveBeenCalledWith(createData);
  });
});
