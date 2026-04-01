import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";
import type { CreateWorkflowInput } from "../services/workflow.service";

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

describe("use-workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
  });

  it("loads workflows with provided filters", async () => {
    mockGetWorkflows.mockResolvedValue({
      workflows: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      },
    });

    const { result } = renderHook(
      () => useWorkflows({ page: 1, limit: 10, search: "auto" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetWorkflows).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: "auto",
    });
  });

  it("creates workflow and triggers success toast", async () => {
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

    const { result } = renderHook(() => useCreateWorkflow(), { wrapper });
    const payload: CreateWorkflowInput = { pipelineId: "p1", name: "Auto" };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCreateWorkflow).toHaveBeenCalledWith(payload);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Workflow created successfully" }),
    );
  });

  it("loads workflow templates and runs", async () => {
    mockGetWorkflowTemplates.mockResolvedValue({
      templates: [{ templateKey: "new-sales-sales-won-follow-up" }],
    });
    mockGetWorkflowRuns.mockResolvedValue({
      runs: [{ id: "run-1", status: "SUCCEEDED" }],
    });

    const { result: templates } = renderHook(() => useWorkflowTemplates(), {
      wrapper,
    });
    const { result: runs } = renderHook(
      () => useWorkflowRuns("wf1", { limit: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(templates.current.data).toBeDefined());
    await waitFor(() => expect(runs.current.data).toBeDefined());
    expect(mockGetWorkflowTemplates).toHaveBeenCalled();
    expect(mockGetWorkflowRuns).toHaveBeenCalledWith("wf1", { limit: 5 });
  });

  it("installs workflow template and triggers success toast", async () => {
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
        templateKey: "new-sales-sales-won-follow-up",
        data: { overwriteExisting: true },
      });
    });

    expect(mockInstallWorkflowTemplate).toHaveBeenCalledWith(
      "new-sales-sales-won-follow-up",
      { overwriteExisting: true },
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Workflow template updated",
        description: "Workflow template overwritten successfully",
      }),
    );
  });

  it("does not load workflow templates when workflows feature is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useWorkflowTemplates(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetWorkflowTemplates).not.toHaveBeenCalled();
  });

  it("updates and deletes workflow via mutations", async () => {
    mockUpdateWorkflow.mockResolvedValue({ workflow: { id: "wf1" } });
    mockDeleteWorkflow.mockResolvedValue(undefined);

    const { result: update } = renderHook(() => useUpdateWorkflow(), {
      wrapper,
    });
    const { result: remove } = renderHook(() => useDeleteWorkflow(), {
      wrapper,
    });

    await act(async () => {
      await update.current.mutateAsync({
        id: "wf1",
        data: { name: "Updated workflow" },
      });
      await remove.current.mutateAsync("wf1");
    });

    expect(mockUpdateWorkflow).toHaveBeenCalledWith("wf1", {
      name: "Updated workflow",
    });
    expect(mockDeleteWorkflow).toHaveBeenCalledWith("wf1");
  });
});
