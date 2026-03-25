import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";
import type { CreateWorkflowInput } from "../services/workflow.service";

const mockGetWorkflows = vi.fn();
const mockCreateWorkflow = vi.fn();
const mockUpdateWorkflow = vi.fn();
const mockDeleteWorkflow = vi.fn();
const mockToast = vi.fn();

vi.mock("../services/workflow.service", () => ({
  getWorkflows: (...args: unknown[]) => mockGetWorkflows(...args),
  createWorkflow: (...args: unknown[]) => mockCreateWorkflow(...args),
  updateWorkflow: (...args: unknown[]) => mockUpdateWorkflow(...args),
  deleteWorkflow: (...args: unknown[]) => mockDeleteWorkflow(...args),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "./use-workflows";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

describe("use-workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
