import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetTrashItems = vi.fn();
const mockRestoreTrashItem = vi.fn();

vi.mock("../services/trash.service", () => ({
  getTrashItems: (...args: unknown[]) => mockGetTrashItems(...args),
  restoreTrashItem: (...args: unknown[]) => mockRestoreTrashItem(...args),
  permanentlyDeleteTrashItem: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useTrashItems, useRestoreTrashItem } from "./use-trash";

describe("useTrashItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrashItems.mockResolvedValue({ items: [], pagination: {} });
  });

  it("calls getTrashItems with params", async () => {
    const { result } = renderHook(() => useTrashItems({ page: 1, limit: 10 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetTrashItems).toHaveBeenCalled();
  });
});

describe("useRestoreTrashItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRestoreTrashItem.mockResolvedValue({});
  });

  it("calls restoreTrashItem on mutation", async () => {
    const { result } = renderHook(() => useRestoreTrashItem(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entityType: "product", id: "p1" });
    });

    expect(mockRestoreTrashItem).toHaveBeenCalledWith("product", "p1");
  });
});
