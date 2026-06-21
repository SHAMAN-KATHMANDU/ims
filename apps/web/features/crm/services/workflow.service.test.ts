import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWorkflows,
  getWorkflowTemplates,
  getWorkflowRuns,
  getWorkflowById,
  createWorkflow,
  installWorkflowTemplate,
  updateWorkflow,
  deleteWorkflow,
} from "./workflow.service";
import type {
  Workflow,
  WorkflowTemplate,
  WorkflowRun,
} from "./workflow.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockHandleApiError = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: (...args: unknown[]) => mockHandleApiError(...args),
}));

describe("workflow.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkflows", () => {
    it("gets workflows with all optional params", async () => {
      mockGet.mockResolvedValue({
        data: {
          workflows: [
            {
              id: "wf1",
              name: "Test Workflow",
              rules: [],
            } as unknown as Workflow,
          ],
          pagination: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getWorkflows({
        page: 1,
        limit: 10,
        search: "auto",
        pipelineId: "p1",
        isActive: true,
      });

      expect(mockGet).toHaveBeenCalledWith("/workflows", {
        params: {
          page: 1,
          limit: 10,
          search: "auto",
          pipelineId: "p1",
          isActive: true,
        },
      });
      expect(result.workflows).toHaveLength(1);
      expect(result.pagination?.currentPage).toBe(1);
    });

    it("gets workflows without params (default case)", async () => {
      mockGet.mockResolvedValue({
        data: { workflows: [] },
      });

      const result = await getWorkflows();

      expect(mockGet).toHaveBeenCalledWith("/workflows", { params: undefined });
      expect(result.workflows).toEqual([]);
    });

    it("gets workflows with selective params (search only)", async () => {
      mockGet.mockResolvedValue({
        data: { workflows: [] },
      });

      await getWorkflows({ search: "sales" });

      expect(mockGet).toHaveBeenCalledWith("/workflows", {
        params: { search: "sales" },
      });
    });

    it("handles empty workflows list", async () => {
      mockGet.mockResolvedValue({
        data: { workflows: [] },
      });

      const result = await getWorkflows();

      expect(result.workflows).toEqual([]);
      expect(result.pagination).toBeUndefined();
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Network down");
      mockGet.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(getWorkflows()).rejects.toThrow("Network down");
      expect(mockHandleApiError).toHaveBeenCalledWith(error, "fetch workflows");
    });
  });

  describe("getWorkflowById", () => {
    it("gets workflow by id with correct URL", async () => {
      const workflow: Workflow = {
        id: "wf1",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Test",
        isActive: true,
        origin: "CUSTOM",
        rules: [],
      };

      mockGet.mockResolvedValue({
        data: { workflow },
      });

      const result = await getWorkflowById("wf1");

      expect(mockGet).toHaveBeenCalledWith("/workflows/wf1");
      expect(result.workflow.id).toBe("wf1");
    });

    it("builds URL correctly with special characters in id", async () => {
      mockGet.mockResolvedValue({
        data: {
          workflow: { id: "wf-uuid-123-abc", rules: [] } as unknown as Workflow,
        },
      });

      await getWorkflowById("wf-uuid-123-abc");

      expect(mockGet).toHaveBeenCalledWith("/workflows/wf-uuid-123-abc");
    });

    it("handles workflow not found error", async () => {
      const error = new Error("Not found");
      mockGet.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(getWorkflowById("nonexistent")).rejects.toThrow("Not found");
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        'fetch workflow "nonexistent"',
      );
    });

    it("returns workflow with all properties", async () => {
      const workflow: Workflow = {
        id: "wf1",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Advanced Workflow",
        description: "A detailed workflow",
        isActive: true,
        templateKey: "template-1",
        templateVersion: 2,
        origin: "TEMPLATE",
        version: 5,
        publishedAt: "2025-01-15T10:00:00Z",
        lastRunAt: "2025-01-15T11:00:00Z",
        lastErrorAt: null,
        runCount: 42,
        failureCount: 2,
        pipeline: { id: "p1", name: "Sales Pipeline" },
        rules: [
          {
            id: "r1",
            trigger: "DEAL_CREATED",
            triggerStageId: null,
            action: "SEND_NOTIFICATION",
            actionConfig: {},
            ruleOrder: 1,
          },
        ],
      };

      mockGet.mockResolvedValue({
        data: { workflow },
      });

      const result = await getWorkflowById("wf1");

      expect(result.workflow).toEqual(workflow);
      expect(result.workflow.version).toBe(5);
      expect(result.workflow.runCount).toBe(42);
    });
  });

  describe("getWorkflowTemplates", () => {
    it("gets workflow templates", async () => {
      const templates: WorkflowTemplate[] = [
        {
          templateKey: "sales-won-follow-up",
          name: "Sales Won Follow-up",
          description: "Auto-send follow-up",
          category: "DEFAULT",
          difficulty: "BEGINNER",
          recommended: true,
          supportedObjects: ["DEAL"],
          pipelineType: "NEW_SALES",
          version: 1,
          isInstalled: false,
          isOutdated: false,
          installedWorkflowId: null,
          installedWorkflowName: null,
          installedPipelineId: null,
          installedPipelineName: null,
          installedAt: null,
          isActive: false,
          installedCount: 0,
          installState: "AVAILABLE",
          availablePipelines: [{ id: "p1", name: "Sales", type: "NEW_SALES" }],
          rulesPreview: [],
        },
      ];

      mockGet.mockResolvedValue({
        data: { templates },
      });

      const result = await getWorkflowTemplates();

      expect(mockGet).toHaveBeenCalledWith("/workflows/templates");
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0]!.templateKey).toBe("sales-won-follow-up");
    });

    it("handles empty templates list", async () => {
      mockGet.mockResolvedValue({
        data: { templates: [] },
      });

      const result = await getWorkflowTemplates();

      expect(result.templates).toEqual([]);
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Service unavailable");
      mockGet.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(getWorkflowTemplates()).rejects.toThrow(
        "Service unavailable",
      );
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        "fetch workflow templates",
      );
    });
  });

  describe("getWorkflowRuns", () => {
    it("gets workflow runs with limit param", async () => {
      const runs: WorkflowRun[] = [
        {
          id: "run1",
          workflowId: "wf1",
          ruleId: "r1",
          trigger: "DEAL_CREATED",
          action: "SEND_NOTIFICATION",
          status: "SUCCEEDED",
          entityType: "Deal",
          entityId: "d1",
          attempt: 1,
          startedAt: "2025-01-15T10:00:00Z",
          completedAt: "2025-01-15T10:05:00Z",
        },
      ];

      mockGet.mockResolvedValue({
        data: { runs },
      });

      const result = await getWorkflowRuns("wf1", { limit: 5 });

      expect(mockGet).toHaveBeenCalledWith("/workflows/wf1/runs", {
        params: { limit: 5 },
      });
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0]!.status).toBe("SUCCEEDED");
    });

    it("gets workflow runs without params", async () => {
      mockGet.mockResolvedValue({
        data: { runs: [] },
      });

      const result = await getWorkflowRuns("wf1");

      expect(mockGet).toHaveBeenCalledWith("/workflows/wf1/runs", {
        params: undefined,
      });
      expect(result.runs).toEqual([]);
    });

    it("handles multiple runs with different statuses", async () => {
      const runs: WorkflowRun[] = [
        {
          id: "run1",
          workflowId: "wf1",
          ruleId: "r1",
          trigger: "DEAL_CREATED",
          action: "SEND_NOTIFICATION",
          status: "SUCCEEDED",
          entityType: "Deal",
          entityId: "d1",
          attempt: 1,
          startedAt: "2025-01-15T10:00:00Z",
          completedAt: "2025-01-15T10:05:00Z",
        },
        {
          id: "run2",
          workflowId: "wf1",
          ruleId: "r1",
          trigger: "DEAL_CREATED",
          action: "SEND_NOTIFICATION",
          status: "FAILED",
          entityType: "Deal",
          entityId: "d2",
          attempt: 1,
          errorMessage: "Email service down",
          startedAt: "2025-01-15T10:06:00Z",
          completedAt: "2025-01-15T10:07:00Z",
        },
      ];

      mockGet.mockResolvedValue({
        data: { runs },
      });

      const result = await getWorkflowRuns("wf1", { limit: 10 });

      expect(result.runs).toHaveLength(2);
      expect(result.runs[0]!.status).toBe("SUCCEEDED");
      expect(result.runs[1]!.status).toBe("FAILED");
      expect(result.runs[1]!.errorMessage).toBe("Email service down");
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Not found");
      mockGet.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(getWorkflowRuns("invalid-id")).rejects.toThrow("Not found");
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        'fetch workflow runs for "invalid-id"',
      );
    });
  });

  describe("createWorkflow", () => {
    it("creates workflow with required fields", async () => {
      const workflow: Workflow = {
        id: "wf-new",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Auto Follow-up",
        isActive: false,
        origin: "CUSTOM",
        rules: [],
      };

      mockPost.mockResolvedValue({
        data: { workflow },
      });

      const result = await createWorkflow({
        pipelineId: "p1",
        name: "Auto Follow-up",
      });

      expect(mockPost).toHaveBeenCalledWith("/workflows", {
        pipelineId: "p1",
        name: "Auto Follow-up",
      });
      expect(result.workflow.id).toBe("wf-new");
    });

    it("creates workflow with all optional fields", async () => {
      const workflow: Workflow = {
        id: "wf-new",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Advanced Workflow",
        description: "A complex workflow",
        isActive: true,
        origin: "CUSTOM",
        rules: [],
      };

      mockPost.mockResolvedValue({
        data: { workflow },
      });

      const result = await createWorkflow({
        pipelineId: "p1",
        name: "Advanced Workflow",
        isActive: true,
      });

      expect(mockPost).toHaveBeenCalledWith("/workflows", {
        pipelineId: "p1",
        name: "Advanced Workflow",
        isActive: true,
      });
      expect(result.workflow.isActive).toBe(true);
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Invalid pipeline");
      mockPost.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(
        createWorkflow({ pipelineId: "invalid", name: "Test" }),
      ).rejects.toThrow("Invalid pipeline");
      expect(mockHandleApiError).toHaveBeenCalledWith(error, "create workflow");
    });
  });

  describe("installWorkflowTemplate", () => {
    it("installs workflow template with options", async () => {
      const response = {
        workflow: {
          id: "wf-installed",
          tenantId: "t1",
          pipelineId: "p1",
          name: "Sales Won Follow-up",
          isActive: true,
          origin: "TEMPLATE" as const,
          rules: [],
        } as Workflow,
        outcome: "installed" as const,
        message: "Workflow template installed successfully",
      };

      mockPost.mockResolvedValue({
        data: response,
      });

      const result = await installWorkflowTemplate("sales-won-follow-up", {
        overwriteExisting: true,
        activate: true,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/workflows/templates/sales-won-follow-up/install",
        {
          overwriteExisting: true,
          activate: true,
        },
      );
      expect(result.outcome).toBe("installed");
      expect(result.workflow.origin).toBe("TEMPLATE");
    });

    it("installs workflow template without data", async () => {
      const response = {
        workflow: {
          id: "wf-installed",
          tenantId: "t1",
          pipelineId: "p1",
          name: "Template Name",
          isActive: false,
          origin: "TEMPLATE" as const,
          rules: [],
        } as Workflow,
        outcome: "reused" as const,
        message: "Existing workflow reused",
      };

      mockPost.mockResolvedValue({
        data: response,
      });

      const result = await installWorkflowTemplate("template-key");

      expect(mockPost).toHaveBeenCalledWith(
        "/workflows/templates/template-key/install",
        undefined,
      );
      expect(result.outcome).toBe("reused");
    });

    it("handles template key with special characters", async () => {
      mockPost.mockResolvedValue({
        data: {
          workflow: {
            id: "wf-installed",
            tenantId: "t1",
            pipelineId: "p1",
            name: "Template",
            isActive: false,
            origin: "TEMPLATE" as const,
            rules: [],
          } as Workflow,
          outcome: "installed" as const,
          message: "Installed",
        },
      });

      await installWorkflowTemplate("new-sales-sales-won-follow-up", {
        overwriteExisting: true,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/workflows/templates/new-sales-sales-won-follow-up/install",
        { overwriteExisting: true },
      );
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Template not found");
      mockPost.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(installWorkflowTemplate("invalid-template")).rejects.toThrow(
        "Template not found",
      );
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        'install workflow template "invalid-template"',
      );
    });
  });

  describe("updateWorkflow", () => {
    it("updates workflow with single field", async () => {
      const workflow: Workflow = {
        id: "wf1",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Updated Name",
        isActive: true,
        origin: "CUSTOM",
        rules: [],
      };

      mockPut.mockResolvedValue({
        data: { workflow },
      });

      const result = await updateWorkflow("wf1", {
        name: "Updated Name",
      });

      expect(mockPut).toHaveBeenCalledWith("/workflows/wf1", {
        name: "Updated Name",
      });
      expect(result.workflow.name).toBe("Updated Name");
    });

    it("updates workflow with multiple fields", async () => {
      const workflow: Workflow = {
        id: "wf1",
        tenantId: "t1",
        pipelineId: "p1",
        name: "New Name",
        description: "New description",
        isActive: false,
        origin: "CUSTOM",
        rules: [],
      };

      mockPut.mockResolvedValue({
        data: { workflow },
      });

      const result = await updateWorkflow("wf1", {
        name: "New Name",
        description: "New description",
        isActive: false,
      });

      expect(mockPut).toHaveBeenCalledWith("/workflows/wf1", {
        name: "New Name",
        description: "New description",
        isActive: false,
      });
      expect(result.workflow.isActive).toBe(false);
    });

    it("updates workflow isActive field only", async () => {
      mockPut.mockResolvedValue({
        data: {
          workflow: {
            id: "wf1",
            tenantId: "t1",
            pipelineId: "p1",
            name: "Workflow",
            isActive: true,
            origin: "CUSTOM",
            rules: [],
          } as Workflow,
        },
      });

      await updateWorkflow("wf1", { isActive: true });

      expect(mockPut).toHaveBeenCalledWith("/workflows/wf1", {
        isActive: true,
      });
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Workflow not found");
      mockPut.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(
        updateWorkflow("invalid-id", { name: "Test" }),
      ).rejects.toThrow("Workflow not found");
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        'update workflow "invalid-id"',
      );
    });
  });

  describe("deleteWorkflow", () => {
    it("deletes workflow by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteWorkflow("wf1");

      expect(mockDelete).toHaveBeenCalledWith("/workflows/wf1");
    });

    it("deletes workflow with special characters in id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteWorkflow("wf-uuid-123-abc");

      expect(mockDelete).toHaveBeenCalledWith("/workflows/wf-uuid-123-abc");
    });

    it("calls handleApiError on failure", async () => {
      const error = new Error("Cannot delete workflow");
      mockDelete.mockRejectedValue(error);
      mockHandleApiError.mockImplementation(() => {
        throw error;
      });

      await expect(deleteWorkflow("wf1")).rejects.toThrow(
        "Cannot delete workflow",
      );
      expect(mockHandleApiError).toHaveBeenCalledWith(
        error,
        'delete workflow "wf1"',
      );
    });
  });

  describe("Edge cases and integration", () => {
    it("handles workflow with null/undefined optional fields", async () => {
      const workflow: Workflow = {
        id: "wf1",
        tenantId: "t1",
        pipelineId: "p1",
        name: "Minimal",
        isActive: true,
        origin: "CUSTOM",
        rules: [],
        description: null,
        templateKey: null,
        publishedAt: null,
      };

      mockGet.mockResolvedValue({
        data: { workflow },
      });

      const result = await getWorkflowById("wf1");

      expect(result.workflow.description).toBeNull();
      expect(result.workflow.templateKey).toBeNull();
    });

    it("handles workflow runs with null error/metadata", async () => {
      const run: WorkflowRun = {
        id: "run1",
        workflowId: "wf1",
        ruleId: null,
        trigger: "DEAL_CREATED",
        action: null,
        status: "SKIPPED",
        entityType: "Deal",
        entityId: "d1",
        attempt: 1,
        errorMessage: null,
        metadata: null,
        startedAt: "2025-01-15T10:00:00Z",
      };

      mockGet.mockResolvedValue({
        data: { runs: [run] },
      });

      const result = await getWorkflowRuns("wf1");

      expect(result.runs[0]!.ruleId).toBeNull();
      expect(result.runs[0]!.action).toBeNull();
      expect(result.runs[0]!.errorMessage).toBeNull();
    });

    it("getWorkflows preserves pagination metadata", async () => {
      mockGet.mockResolvedValue({
        data: {
          workflows: [
            {
              id: "wf1",
              tenantId: "t1",
              pipelineId: "p1",
              name: "Test",
              isActive: true,
              origin: "CUSTOM",
              rules: [],
            } as Workflow,
          ],
          pagination: {
            currentPage: 2,
            itemsPerPage: 20,
            totalItems: 45,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: true,
          },
        },
      });

      const result = await getWorkflows({ page: 2, limit: 20 });

      expect(result.pagination?.currentPage).toBe(2);
      expect(result.pagination?.totalItems).toBe(45);
      expect(result.pagination?.totalPages).toBe(3);
    });

    it("handles concurrent API calls without interference", async () => {
      mockGet.mockResolvedValueOnce({
        data: { templates: [] },
      });
      mockGet.mockResolvedValueOnce({
        data: { runs: [] },
      });

      const [templates, runs] = await Promise.all([
        getWorkflowTemplates(),
        getWorkflowRuns("wf1"),
      ]);

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(templates.templates).toEqual([]);
      expect(runs.runs).toEqual([]);
    });
  });
});
