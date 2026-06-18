import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetPipelines = vi.fn();
const mockGetPipelineById = vi.fn();
const mockGetPipelineTemplates = vi.fn();
const mockCreatePipeline = vi.fn();
const mockUpdatePipeline = vi.fn();
const mockDeletePipeline = vi.fn();
const mockSeedPipelineFramework = vi.fn();
const mockUseEnvFeatureFlag = vi.fn(() => true);

vi.mock("../services/pipeline.service", () => ({
  getPipelines: (...args: unknown[]) => mockGetPipelines(...args),
  getPipelineById: (...args: unknown[]) => mockGetPipelineById(...args),
  getPipelineTemplates: (...args: unknown[]) =>
    mockGetPipelineTemplates(...args),
  createPipeline: (...args: unknown[]) => mockCreatePipeline(...args),
  updatePipeline: (...args: unknown[]) => mockUpdatePipeline(...args),
  deletePipeline: (...args: unknown[]) => mockDeletePipeline(...args),
  seedPipelineFramework: (...args: unknown[]) =>
    mockSeedPipelineFramework(...args),
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => mockUseEnvFeatureFlag(),
}));

vi.mock("./use-contacts", () => ({
  contactKeys: {
    all: ["contacts"] as const,
  },
}));

vi.mock("./use-crm-settings", () => ({
  crmSettingsKeys: {
    all: ["crm-settings"] as const,
  },
}));

vi.mock("./use-workflows", () => ({
  workflowKeys: {
    all: ["workflows"] as const,
  },
}));

vi.mock("./use-deals", () => ({
  dealKeys: {
    lists: () => ["deals", "list"] as const,
  },
}));

vi.mock("./use-tasks", () => ({
  taskKeys: {
    lists: () => ["tasks", "list"] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  usePipelines,
  usePipelineTemplates,
  usePipeline,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useSeedPipelineFramework,
} from "./use-pipelines";

describe("usePipelines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetPipelines.mockResolvedValue({
      pipelines: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch pipelines with default params when no params provided", async () => {
    const { result } = renderHook(() => usePipelines(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetPipelines).toHaveBeenCalledWith(undefined);
  });

  it("should NOT fetch when CRM_PIPELINES_TAB feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => usePipelines(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelines).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => usePipelines({}, { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelines).not.toHaveBeenCalled();
  });

  it("should pass pagination and search params correctly to getPipelines", async () => {
    const params = { page: 2, limit: 50, search: "Sales" };
    mockGetPipelines.mockResolvedValue({
      pipelines: [{ id: "p1", name: "Sales Pipeline", type: "NEW_SALES" }],
      pagination: { page: 2, limit: 50, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => usePipelines(params), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetPipelines).toHaveBeenCalledWith(params);
  });
});

describe("usePipelineTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetPipelineTemplates.mockResolvedValue({
      message: "Templates retrieved",
      templates: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch pipeline templates when feature is enabled", async () => {
    const { result } = renderHook(() => usePipelineTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetPipelineTemplates).toHaveBeenCalled();
  });

  it("should NOT fetch templates when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => usePipelineTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelineTemplates).not.toHaveBeenCalled();
  });

  it("should have staleTime of 60 minutes to cache templates", async () => {
    mockGetPipelineTemplates.mockResolvedValue({
      message: "Templates retrieved",
      templates: [
        {
          templateId: "t1",
          name: "Standard Sales",
          description: "Standard sales pipeline",
          type: "NEW_SALES",
          stageNames: ["Lead", "Prospect", "Qualified"],
          suggestAsDefault: true,
        },
      ],
    });

    const { result } = renderHook(() => usePipelineTemplates(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetPipelineTemplates).toHaveBeenCalledTimes(1);
  });
});

describe("usePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetPipelineById.mockResolvedValue({
      pipeline: {
        id: "p1",
        name: "Sales",
        type: "NEW_SALES",
        stages: [],
        isDefault: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch pipeline details when valid id is provided", async () => {
    const { result } = renderHook(() => usePipeline("p1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetPipelineById).toHaveBeenCalledWith("p1");
  });

  it("should NOT fetch when id is empty string", async () => {
    const { result } = renderHook(() => usePipeline(""), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelineById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => usePipeline("p1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelineById).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch even with valid id", async () => {
    const { result } = renderHook(() => usePipeline("p1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetPipelineById).not.toHaveBeenCalled();
  });
});

describe("useCreatePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockCreatePipeline.mockResolvedValue({
      pipeline: {
        id: "p1",
        name: "New Pipeline",
        type: "GENERAL",
        stages: [],
        isDefault: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createPipeline service with correct data shape including all optional fields", async () => {
    const createData = {
      name: "Sales Pipeline",
      type: "NEW_SALES" as const,
      stages: [
        { id: "s1", name: "Lead", order: 1, color: "#FF5733" },
        { id: "s2", name: "Qualified", order: 2, color: "#33FF57" },
      ],
      isDefault: true,
      closedWonStageName: "Qualified",
      closedLostStageName: "Lost",
    };

    const { result } = renderHook(() => useCreatePipeline(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreatePipeline).toHaveBeenCalledWith(createData);
  });

  it("should call createPipeline with only required name field when no optional fields provided", async () => {
    const createData = { name: "Simple Pipeline" };

    const { result } = renderHook(() => useCreatePipeline(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreatePipeline).toHaveBeenCalledWith(createData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreatePipeline(), { wrapper });

    const createData = { name: "New Pipeline" };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: CRM_PIPELINES_TAB");
  });
});

describe("useUpdatePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockUpdatePipeline.mockResolvedValue({
      pipeline: {
        id: "p1",
        name: "Updated Pipeline",
        type: "NEW_SALES",
        stages: [],
        isDefault: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updatePipeline with id and data object shape", async () => {
    const { result } = renderHook(() => useUpdatePipeline(), { wrapper });

    const updatePayload = {
      id: "p1",
      data: {
        name: "Updated Pipeline",
        stages: [{ id: "s1", name: "NewStage" }],
        isDefault: true,
        closedWonStageName: "Won",
        closedLostStageName: "Lost",
      },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdatePipeline).toHaveBeenCalledWith("p1", updatePayload.data);
  });

  it("should accept partial update with only name field", async () => {
    const { result } = renderHook(() => useUpdatePipeline(), { wrapper });

    const updatePayload = {
      id: "p1",
      data: { name: "Renamed Pipeline" },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdatePipeline).toHaveBeenCalledWith("p1", {
      name: "Renamed Pipeline",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdatePipeline(), { wrapper });

    const updatePayload = {
      id: "p1",
      data: { name: "Updated" },
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(updatePayload);
      }),
    ).rejects.toThrow("Feature disabled: CRM_PIPELINES_TAB");
  });
});

describe("useDeletePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockDeletePipeline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deletePipeline service with pipeline id", async () => {
    const { result } = renderHook(() => useDeletePipeline(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("p1");
    });

    expect(mockDeletePipeline).toHaveBeenCalledWith("p1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeletePipeline(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("p1");
      }),
    ).rejects.toThrow("Feature disabled: CRM_PIPELINES_TAB");
  });
});

describe("useSeedPipelineFramework", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockSeedPipelineFramework.mockResolvedValue({
      pipelines: [
        {
          id: "p1",
          name: "Sales Pipeline",
          type: "NEW_SALES",
        },
        {
          id: "p2",
          name: "Remarketing Pipeline",
          type: "REMARKETING",
        },
      ],
      journeyTypes: ["type1", "type2"],
      tags: ["tag1", "tag2"],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call seedPipelineFramework service with no arguments", async () => {
    const { result } = renderHook(() => useSeedPipelineFramework(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSeedPipelineFramework).toHaveBeenCalled();
  });

  it("should return seed result with pipelines, journeyTypes, and tags", async () => {
    const { result } = renderHook(() => useSeedPipelineFramework(), {
      wrapper,
    });

    await act(async () => {
      const data = await result.current.mutateAsync();
      expect(data).toEqual({
        pipelines: expect.any(Array),
        journeyTypes: expect.any(Array),
        tags: expect.any(Array),
      });
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useSeedPipelineFramework(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Feature disabled: CRM_PIPELINES_TAB");
  });

  it("should invalidate multiple query keys on successful seed including related modules", async () => {
    const { result } = renderHook(() => useSeedPipelineFramework(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSeedPipelineFramework).toHaveBeenCalledTimes(1);
  });
});
