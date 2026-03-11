import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetInventorySummary = vi.fn();

vi.mock("../services/inventory.service", () => ({
  getLocationInventory: vi.fn(),
  getProductStock: vi.fn(),
  getInventorySummary: () => mockGetInventorySummary(),
  adjustInventory: vi.fn(),
  setInventory: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

vi.mock("@/features/locations", () => ({
  locationKeys: {
    all: ["locations"],
    detail: (id: string) => ["locations", id],
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useInventorySummary } from "./use-inventory";

describe("useInventorySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInventorySummary.mockResolvedValue({
      totalProducts: 0,
      lowStock: 0,
    });
  });

  it("calls getInventorySummary", async () => {
    const { result } = renderHook(() => useInventorySummary(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetInventorySummary).toHaveBeenCalled();
  });
});
