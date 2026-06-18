import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetDeals = vi.fn();
const mockGetDealsKanban = vi.fn();
const mockGetDealById = vi.fn();
const mockCreateDeal = vi.fn();
const mockUpdateDeal = vi.fn();
const mockUpdateDealStage = vi.fn();
const mockDeleteDeal = vi.fn();
const mockAddDealLineItem = vi.fn();
const mockRemoveDealLineItem = vi.fn();
const mockConvertDealToSale = vi.fn();
const mockUseEnvFeatureFlag = vi.fn(() => true);

vi.mock("../services/deal.service", () => ({
  getDeals: (...args: unknown[]) => mockGetDeals(...args),
  getDealsKanban: (...args: unknown[]) => mockGetDealsKanban(...args),
  getDealById: (...args: unknown[]) => mockGetDealById(...args),
  createDeal: (...args: unknown[]) => mockCreateDeal(...args),
  updateDeal: (...args: unknown[]) => mockUpdateDeal(...args),
  updateDealStage: (...args: unknown[]) => mockUpdateDealStage(...args),
  deleteDeal: (...args: unknown[]) => mockDeleteDeal(...args),
  addDealLineItem: (...args: unknown[]) => mockAddDealLineItem(...args),
  removeDealLineItem: (...args: unknown[]) => mockRemoveDealLineItem(...args),
  convertDealToSale: (...args: unknown[]) => mockConvertDealToSale(...args),
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => mockUseEnvFeatureFlag(),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
  },
}));

vi.mock("./use-contacts", () => ({
  contactKeys: {
    detail: (id: string) => ["contacts", "detail", id] as const,
  },
}));

vi.mock("./use-tasks", () => ({
  taskKeys: {
    lists: () => ["tasks", "list"] as const,
  },
}));

vi.mock("./use-workflows", () => ({
  workflowKeys: {
    all: ["workflows"] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useDealsPaginated,
  useDealsKanban,
  useDeal,
  useCreateDeal,
  useUpdateDeal,
  useUpdateDealStage,
  useDeleteDeal,
  useAddDealLineItem,
  useRemoveDealLineItem,
  useConvertDealToSale,
  dealKeys,
} from "./use-deals";

describe("useDealsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetDeals.mockResolvedValue({
      data: [],
      pagination: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch deals with default pagination params when no params provided", async () => {
    const { result } = renderHook(() => useDealsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetDeals).toHaveBeenCalledWith({});
  });

  it("should NOT fetch when CRM_DEALS feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDealsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDeals).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useDealsPaginated({}, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDeals).not.toHaveBeenCalled();
  });

  it("should pass pagination and filter params correctly to getDeals", async () => {
    const params = {
      page: 2,
      limit: 50,
      search: "big deal",
      sortBy: "value",
      sortOrder: "asc" as const,
      pipelineId: "pipe1",
      stage: "negotiation",
      status: "OPEN" as const,
      assignedToId: "user1",
      contactId: "contact1",
    };
    mockGetDeals.mockResolvedValue({
      data: [{ id: "d1", name: "Deal 1", value: 50000 }],
      pagination: {
        currentPage: 2,
        itemsPerPage: 50,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });

    const { result } = renderHook(() => useDealsPaginated(params), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetDeals).toHaveBeenCalledWith(params);
  });

  it("should use default values for pagination when partial params provided", async () => {
    mockGetDeals.mockResolvedValue({
      data: [],
      pagination: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    renderHook(() => useDealsPaginated({ search: "search term" }), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockGetDeals).toHaveBeenCalled();
    });

    const callArgs = mockGetDeals.mock.calls[0]![0]!;
    expect(callArgs.search).toBe("search term");
    expect(callArgs.page).toBeUndefined();
    expect(callArgs.limit).toBeUndefined();
  });
});

describe("useDealsKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetDealsKanban.mockResolvedValue({
      pipeline: {},
      stages: [],
      deals: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch kanban data when feature is enabled and no pipelineId provided", async () => {
    const { result } = renderHook(() => useDealsKanban(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetDealsKanban).toHaveBeenCalledWith(undefined);
  });

  it("should fetch kanban data for specific pipeline when pipelineId provided", async () => {
    const { result } = renderHook(() => useDealsKanban("pipe1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetDealsKanban).toHaveBeenCalledWith("pipe1");
  });

  it("should NOT fetch kanban when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDealsKanban("pipe1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDealsKanban).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch kanban", async () => {
    const { result } = renderHook(
      () => useDealsKanban("pipe1", { enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDealsKanban).not.toHaveBeenCalled();
  });
});

describe("useDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetDealById.mockResolvedValue({
      deal: {
        id: "d1",
        name: "Deal 1",
        value: 50000,
        stage: "negotiation",
        status: "OPEN",
        pipelineId: "pipe1",
        assignedToId: "user1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch deal details when id is provided", async () => {
    const { result } = renderHook(() => useDeal("d1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetDealById).toHaveBeenCalledWith("d1");
  });

  it("should NOT fetch when id is empty string", async () => {
    const { result } = renderHook(() => useDeal(""), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDealById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeal("d1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDealById).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch deal", async () => {
    const { result } = renderHook(() => useDeal("d1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetDealById).not.toHaveBeenCalled();
  });
});

describe("useCreateDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockCreateDeal.mockResolvedValue({
      deal: { id: "d1", name: "New Deal", value: 25000 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createDeal service with correct CreateDealData shape", async () => {
    const createData = {
      name: "New Deal",
      value: 25000,
      stage: "prospecting",
      pipelineId: "pipe1",
      assignedToId: "user1",
    };

    const { result } = renderHook(() => useCreateDeal(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateDeal).toHaveBeenCalledWith(createData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateDeal(), { wrapper });

    const createData = { name: "New Deal", value: 25000 };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });

  it("should handle CreateDealData with minimal required fields", async () => {
    const createData = { name: "Minimal Deal" };

    const { result } = renderHook(() => useCreateDeal(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateDeal).toHaveBeenCalledWith(createData);
  });
});

describe("useUpdateDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockUpdateDeal.mockResolvedValue({
      deal: { id: "d1", name: "Updated Deal", value: 30000 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateDeal with id and data object shape (not positional)", async () => {
    const { result } = renderHook(() => useUpdateDeal(), { wrapper });

    const updatePayload = {
      id: "d1",
      data: { name: "Updated Deal", value: 30000, status: "WON" as const },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateDeal).toHaveBeenCalledWith("d1", {
      name: "Updated Deal",
      value: 30000,
      status: "WON",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateDeal(), { wrapper });

    const updatePayload = { id: "d1", data: { name: "Updated" } };

    await expect(
      act(async () => {
        await result.current.mutateAsync(updatePayload);
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });

  it("should handle UpdateDealData with partial fields", async () => {
    const { result } = renderHook(() => useUpdateDeal(), { wrapper });

    const updatePayload = { id: "d1", data: { value: 35000 } };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateDeal).toHaveBeenCalledWith("d1", { value: 35000 });
  });

  it("should handle update with status and lostReason for lost deals", async () => {
    const { result } = renderHook(() => useUpdateDeal(), { wrapper });

    const updatePayload = {
      id: "d1",
      data: { status: "LOST" as const, lostReason: "Budget cuts" },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateDeal).toHaveBeenCalledWith("d1", {
      status: "LOST",
      lostReason: "Budget cuts",
    });
  });
});

describe("useUpdateDealStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockUpdateDealStage.mockResolvedValue({
      deal: { id: "d1", stage: "closing" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateDealStage with id and stage", async () => {
    const { result } = renderHook(() => useUpdateDealStage(), { wrapper });

    const stagePayload = {
      id: "d1",
      stage: "closing",
    };

    await act(async () => {
      await result.current.mutateAsync(stagePayload);
    });

    expect(mockUpdateDealStage).toHaveBeenCalledWith("d1", {
      stage: "closing",
    });
  });

  it("should include pipelineId when targetPipelineId is provided", async () => {
    const { result } = renderHook(() => useUpdateDealStage(), { wrapper });

    const stagePayload = {
      id: "d1",
      stage: "closing",
      targetPipelineId: "pipe2",
    };

    await act(async () => {
      await result.current.mutateAsync(stagePayload);
    });

    expect(mockUpdateDealStage).toHaveBeenCalledWith("d1", {
      stage: "closing",
      pipelineId: "pipe2",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateDealStage(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: "d1", stage: "closing" });
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });
});

describe("useDeleteDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockDeleteDeal.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteDeal service with deal id", async () => {
    const { result } = renderHook(() => useDeleteDeal(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("d1");
    });

    expect(mockDeleteDeal).toHaveBeenCalledWith("d1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteDeal(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("d1");
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });
});

describe("useAddDealLineItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockAddDealLineItem.mockResolvedValue({
      item: {
        id: "li1",
        productId: "prod1",
        quantity: 5,
        unitPrice: 100,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call addDealLineItem with dealId and AddDealLineItemData", async () => {
    const { result } = renderHook(() => useAddDealLineItem("d1"), { wrapper });

    const lineItemData = {
      productId: "prod1",
      quantity: 5,
      unitPrice: 100,
    };

    await act(async () => {
      await result.current.mutateAsync(lineItemData);
    });

    expect(mockAddDealLineItem).toHaveBeenCalledWith("d1", lineItemData);
  });

  it("should handle line item data with optional variation ID", async () => {
    const { result } = renderHook(() => useAddDealLineItem("d1"), { wrapper });

    const lineItemData = {
      productId: "prod1",
      variationId: "var1",
      quantity: 3,
      unitPrice: 200,
    };

    await act(async () => {
      await result.current.mutateAsync(lineItemData);
    });

    expect(mockAddDealLineItem).toHaveBeenCalledWith("d1", lineItemData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAddDealLineItem("d1"), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ productId: "prod1" });
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });
});

describe("useRemoveDealLineItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockRemoveDealLineItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call removeDealLineItem with dealId and lineItemId", async () => {
    const { result } = renderHook(() => useRemoveDealLineItem("d1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("li1");
    });

    expect(mockRemoveDealLineItem).toHaveBeenCalledWith("d1", "li1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useRemoveDealLineItem("d1"), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("li1");
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });
});

describe("useConvertDealToSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockConvertDealToSale.mockResolvedValue({
      sale: { id: "sale1", saleCode: "S001", total: 50000 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call convertDealToSale with dealId and locationId", async () => {
    const { result } = renderHook(() => useConvertDealToSale("d1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("loc1");
    });

    expect(mockConvertDealToSale).toHaveBeenCalledWith("d1", "loc1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useConvertDealToSale("d1"), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("loc1");
      }),
    ).rejects.toThrow("Feature disabled: CRM_DEALS");
  });
});

describe("dealKeys", () => {
  it("should generate consistent query keys for deals", () => {
    const listKey = dealKeys.list({ page: 1, limit: 20 });
    expect(listKey).toEqual(["deals", "list", { page: 1, limit: 20 }]);
  });

  it("should generate kanban keys with optional pipelineId", () => {
    const kanbanKeyWithoutPipeline = dealKeys.kanban();
    const kanbanKeyWithPipeline = dealKeys.kanban("pipe1");

    expect(kanbanKeyWithoutPipeline).toEqual(["deals", "kanban"]);
    expect(kanbanKeyWithPipeline).toEqual(["deals", "kanban", "pipe1"]);
  });

  it("should generate detail keys with deal id", () => {
    const detailKey = dealKeys.detail("d1");
    expect(detailKey).toEqual(["deals", "detail", "d1"]);
  });
});
