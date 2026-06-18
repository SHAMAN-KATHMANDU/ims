import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "../services/workflow.service";

const mockGetWorkflows = vi.fn();
const mockGetWorkflowTemplates = vi.fn();
const mockGetWorkflowRuns = vi.fn();
const mockCreateWorkflow = vi.fn();
const mockInstallWorkflowTemplate = vi.fn();
const mockUpdateWorkflow = vi.fn();
const mockDeleteWorkflow = vi.fn();
const mockToast = vi.fn();
const mockUseEnvFeatureFlag = vi.fn(() => true);

vi.mock("../services/workflow.service", () => ({
  getWorkflows: (...args: unknown[]) => mockGetWorkflows(...args),
  getWorkflowTemplates: (...args: unknown[]) =>
    mockGetWorkflowTemplates(...args),
  getWorkflowRuns: (...args: unknown[]) => mockGetWorkflowRuns(...args),
  createWorkflow: (...args: unknown[]) => mockCreateWorkflow(...args),
  installWorkflowTemplate: (...args: unknown[]) =>
    mockInstallWorkflowTemplate(...args),
  updateWorkflow: (...args: unknown[]) => mockUpdateWorkflow(...args),
  deleteWorkflow: (...args: unknown[]) => mockDeleteWorkflow(...args),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => mockUseEnvFeatureFlag(),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
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

import {
  useWorkflows,
  useWorkflowTemplates,
  useWorkflowRuns,
  useCreateWorkflow,
  useInstallWorkflowTemplate,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "./use-workflows";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

describe("useWorkflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetWorkflows.mockResolvedValue({
      workflows: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch workflows with default params when no params provided", async () => {
    const { result } = renderHook(() => useWorkflows(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetWorkflows).toHaveBeenCalledWith(undefined);
  });

  it("should NOT fetch workflows when CRM_WORKFLOWS feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useWorkflows(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflows).not.toHaveBeenCalled();
  });

  it("should NOT fetch workflows when enabled option is false even if feature flag is true", async () => {
    const { result } = renderHook(() => useWorkflows({}, { enabled: false }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflows).not.toHaveBeenCalled();
  });

  it("should fetch workflows with provided filters", async () => {
    mockGetWorkflows.mockResolvedValue({
      workflows: [{ id: "wf1", name: "Test" }],
      pagination: {
        currentPage: 2,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 10,
      },
    });

    const { result } = renderHook(
      () =>
        useWorkflows({ page: 2, limit: 10, search: "auto", isActive: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetWorkflows).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: "auto",
      isActive: true,
    });
  });
});

describe("useWorkflowTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetWorkflowTemplates.mockResolvedValue({
      templates: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch workflow templates when feature is enabled", async () => {
    const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetWorkflowTemplates).toHaveBeenCalled();
  });

  it("should NOT fetch templates when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useWorkflowTemplates(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowTemplates).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch templates", async () => {
    const { result } = renderHook(
      () => useWorkflowTemplates({ enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowTemplates).not.toHaveBeenCalled();
  });
});

describe("useWorkflowRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockGetWorkflowRuns.mockResolvedValue({
      runs: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch workflow runs with valid workflow id", async () => {
    const { result } = renderHook(() => useWorkflowRuns("wf1", { limit: 5 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetWorkflowRuns).toHaveBeenCalledWith("wf1", { limit: 5 });
  });

  it("should NOT fetch workflow runs when id is empty string", async () => {
    const { result } = renderHook(() => useWorkflowRuns(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowRuns).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useWorkflowRuns("wf1", { limit: 5 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowRuns).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch runs", async () => {
    const { result } = renderHook(
      () => useWorkflowRuns("wf1", { limit: 5 }, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowRuns).not.toHaveBeenCalled();
  });
});

describe("useCreateWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockCreateWorkflow.mockResolvedValue({
      workflow: {
        id: "wf1",
        name: "Auto",
        isActive: true,
        rules: [],
        pipelineId: "p1",
        tenantId: "t1",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createWorkflow with correct data shape", async () => {
    const { result } = renderHook(() => useCreateWorkflow(), { wrapper });
    const payload: CreateWorkflowInput = {
      pipelineId: "p1",
      name: "Auto Workflow",
      isActive: true,
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCreateWorkflow).toHaveBeenCalledWith(payload);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateWorkflow(), { wrapper });
    const payload: CreateWorkflowInput = { pipelineId: "p1", name: "Auto" };

    await expect(
      act(async () => {
        await result.current.mutateAsync(payload);
      }),
    ).rejects.toThrow("Feature disabled: CRM_WORKFLOWS");
  });

  it("should trigger success toast on successful creation", async () => {
    const { result } = renderHook(() => useCreateWorkflow(), { wrapper });
    const payload: CreateWorkflowInput = { pipelineId: "p1", name: "Test" };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Workflow created successfully" }),
    );
  });

  it("should trigger error toast on creation failure", async () => {
    const error = new Error("API Error");
    mockCreateWorkflow.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateWorkflow(), { wrapper });
    const payload: CreateWorkflowInput = { pipelineId: "p1", name: "Test" };

    await act(async () => {
      try {
        await result.current.mutateAsync(payload);
      } catch {
        // Expected error
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to create workflow",
        variant: "destructive",
      }),
    );
  });
});

describe("useInstallWorkflowTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockInstallWorkflowTemplate.mockResolvedValue({
      workflow: { id: "wf-template" },
      outcome: "installed",
      message: "Workflow template installed successfully",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call installWorkflowTemplate with templateKey and data", async () => {
    const { result } = renderHook(() => useInstallWorkflowTemplate(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        templateKey: "new-sales-sales-won-follow-up",
        data: { overwriteExisting: true, activate: true },
      });
    });

    expect(mockInstallWorkflowTemplate).toHaveBeenCalledWith(
      "new-sales-sales-won-follow-up",
      { overwriteExisting: true, activate: true },
    );
  });

  it("should show different toast message for 'reused' outcome", async () => {
    mockInstallWorkflowTemplate.mockResolvedValue({
      workflow: { id: "wf-template" },
      outcome: "reused",
      message: "Template already installed",
    });

    const { result } = renderHook(() => useInstallWorkflowTemplate(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        templateKey: "template-key",
        data: undefined,
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Workflow template already installed",
        description: "Template already installed",
      }),
    );
  });

  it("should show different toast message for 'overwritten' outcome", async () => {
    mockInstallWorkflowTemplate.mockResolvedValue({
      workflow: { id: "wf-template" },
      outcome: "overwritten",
      message: "Workflow template overwritten successfully",
    });

    const { result } = renderHook(() => useInstallWorkflowTemplate(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        templateKey: "template-key",
        data: { overwriteExisting: true },
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Workflow template updated",
        description: "Workflow template overwritten successfully",
      }),
    );
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useInstallWorkflowTemplate(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          templateKey: "template-key",
        });
      }),
    ).rejects.toThrow("Feature disabled: CRM_WORKFLOWS");
  });
});

describe("useUpdateWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockUpdateWorkflow.mockResolvedValue({
      workflow: { id: "wf1", name: "Updated" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateWorkflow with id and data object shape", async () => {
    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper });
    const payload = {
      id: "wf1",
      data: {
        name: "Updated Workflow",
        isActive: false,
      } as UpdateWorkflowInput,
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockUpdateWorkflow).toHaveBeenCalledWith("wf1", {
      name: "Updated Workflow",
      isActive: false,
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          id: "wf1",
          data: { name: "Updated" },
        });
      }),
    ).rejects.toThrow("Feature disabled: CRM_WORKFLOWS");
  });

  it("should trigger success toast on successful update", async () => {
    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "wf1",
        data: { name: "Updated" },
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Workflow updated successfully" }),
    );
  });

  it("should trigger error toast on update failure", async () => {
    mockUpdateWorkflow.mockRejectedValue(new Error("Update failed"));

    const { result } = renderHook(() => useUpdateWorkflow(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: "wf1",
          data: { name: "Updated" },
        });
      } catch {
        // Expected error
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to update workflow",
        variant: "destructive",
      }),
    );
  });
});

describe("useDeleteWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockDeleteWorkflow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteWorkflow with workflow id", async () => {
    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("wf1");
    });

    expect(mockDeleteWorkflow).toHaveBeenCalledWith("wf1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("wf1");
      }),
    ).rejects.toThrow("Feature disabled: CRM_WORKFLOWS");
  });

  it("should trigger success toast on successful deletion", async () => {
    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("wf1");
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Workflow deleted successfully" }),
    );
  });

  it("should trigger error toast on deletion failure", async () => {
    mockDeleteWorkflow.mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook(() => useDeleteWorkflow(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("wf1");
      } catch {
        // Expected error
      }
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Failed to delete workflow",
        variant: "destructive",
      }),
    );
  });
});
