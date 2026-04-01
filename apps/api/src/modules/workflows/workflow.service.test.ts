import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindAllByTenant = vi.fn();
const mockFindByPipeline = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFindTemplateCatalog = vi.fn();
const mockInstallTemplate = vi.fn();
const mockFindRecentRuns = vi.fn();

vi.mock("./workflow.repository", () => ({
  default: {
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    findByPipeline: (...args: unknown[]) => mockFindByPipeline(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    findTemplateCatalog: (...args: unknown[]) =>
      mockFindTemplateCatalog(...args),
    installTemplate: (...args: unknown[]) => mockInstallTemplate(...args),
    findRecentRuns: (...args: unknown[]) => mockFindRecentRuns(...args),
  },
}));

vi.mock("@/modules/pipelines/pipeline.repository", () => ({
  default: {
    findByType: vi.fn(),
  },
}));

import workflowService from "./workflow.service";

describe("WorkflowService", () => {
  const tenantId = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns workflows from repository", async () => {
      const workflows = [
        { id: "w1", name: "Follow-up", pipelineId: "p1", tenantId },
      ];
      mockFindAllByTenant.mockResolvedValue(workflows);

      const result = await workflowService.getAll(tenantId);

      expect(mockFindAllByTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual({ workflows });
    });
  });

  describe("getByPipeline", () => {
    it("returns workflows for pipeline", async () => {
      const workflows = [
        { id: "w1", name: "Follow-up", pipelineId: "p1", tenantId },
      ];
      mockFindByPipeline.mockResolvedValue(workflows);

      const result = await workflowService.getByPipeline(tenantId, "p1");

      expect(mockFindByPipeline).toHaveBeenCalledWith(tenantId, "p1");
      expect(result).toEqual(workflows);
    });
  });

  describe("getTemplateCatalog", () => {
    it("returns workflow template catalog", async () => {
      mockFindTemplateCatalog.mockResolvedValue([
        { templateKey: "new-sales-sales-won-follow-up", isInstalled: false },
      ]);

      const result = await workflowService.getTemplateCatalog(tenantId);

      expect(mockFindTemplateCatalog).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual([
        { templateKey: "new-sales-sales-won-follow-up", isInstalled: false },
      ]);
    });
  });

  describe("getById", () => {
    it("returns workflow when found", async () => {
      const workflow = {
        id: "w1",
        name: "Follow-up",
        pipelineId: "p1",
        tenantId,
        isActive: true,
      };
      mockFindById.mockResolvedValue(workflow);

      const result = await workflowService.getById(tenantId, "w1");

      expect(mockFindById).toHaveBeenCalledWith(tenantId, "w1");
      expect(result).toEqual(workflow);
    });

    it("throws 404 when workflow not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        workflowService.getById(tenantId, "w1"),
      ).rejects.toMatchObject({
        message: "Workflow not found",
        statusCode: 404,
      });
    });
  });

  describe("create", () => {
    it("creates workflow via repository", async () => {
      const data = {
        pipelineId: "00000000-0000-0000-0000-000000000001",
        name: "Follow-up",
        isActive: true,
      };
      const created = { id: "w1", ...data, tenantId };
      mockCreate.mockResolvedValue(created);

      const result = await workflowService.create(tenantId, data);

      expect(mockCreate).toHaveBeenCalledWith(tenantId, data);
      expect(result).toEqual(created);
    });

    it("throws 400 when rule actionConfig is invalid", async () => {
      const data = {
        pipelineId: "00000000-0000-0000-0000-000000000001",
        name: "Bad",
        isActive: true,
        rules: [
          {
            trigger: "STAGE_ENTER" as const,
            triggerStageId: "Proposal",
            action: "MOVE_STAGE" as const,
            actionConfig: { targetStageId: "" },
            ruleOrder: 0,
          },
        ],
      };

      await expect(
        workflowService.create(tenantId, data),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Rule 1"),
        statusCode: 400,
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates workflow when found", async () => {
      const existing = {
        id: "w1",
        name: "Old",
        pipelineId: "p1",
        tenantId,
        isActive: true,
      };
      const data = { name: "Updated", isActive: false };
      const updated = { ...existing, ...data };
      mockFindById.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(updated);

      const result = await workflowService.update(tenantId, "w1", data);

      expect(mockFindById).toHaveBeenCalledWith(tenantId, "w1");
      expect(mockUpdate).toHaveBeenCalledWith("w1", tenantId, {
        name: "Updated",
        description: undefined,
        isActive: false,
        rules: undefined,
      });
      expect(result).toEqual(updated);
    });

    it("throws 404 when workflow not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        workflowService.update(tenantId, "w1", { name: "Updated" }),
      ).rejects.toMatchObject({
        message: "Workflow not found",
        statusCode: 404,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("throws 400 when rules actionConfig is invalid", async () => {
      mockFindById.mockResolvedValue({
        id: "w1",
        name: "Old",
        pipelineId: "p1",
        tenantId,
        isActive: true,
      });
      const data = {
        rules: [
          {
            trigger: "DEAL_CREATED" as const,
            action: "UPDATE_FIELD" as const,
            actionConfig: {},
            ruleOrder: 0,
          },
        ],
      };

      await expect(
        workflowService.update(tenantId, "w1", data),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Rule 1"),
        statusCode: 400,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes workflow when found", async () => {
      const existing = {
        id: "w1",
        name: "Follow-up",
        pipelineId: "p1",
        tenantId,
      };
      mockFindById.mockResolvedValue(existing);
      mockDelete.mockResolvedValue(undefined);

      await workflowService.delete(tenantId, "w1");

      expect(mockFindById).toHaveBeenCalledWith(tenantId, "w1");
      expect(mockDelete).toHaveBeenCalledWith("w1", tenantId);
    });

    it("throws 404 when workflow not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        workflowService.delete(tenantId, "w1"),
      ).rejects.toMatchObject({
        message: "Workflow not found",
        statusCode: 404,
      });
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("installTemplate", () => {
    it("installs a workflow template", async () => {
      mockInstallTemplate.mockResolvedValue({
        outcome: "installed",
        workflow: {
          id: "wf-template",
          templateKey: "new-sales-sales-won-follow-up",
        },
      });

      const result = await workflowService.installTemplate(
        tenantId,
        "new-sales-sales-won-follow-up",
        {
          activate: true,
          overwriteExisting: false,
        },
      );

      expect(mockInstallTemplate).toHaveBeenCalledWith(
        tenantId,
        "new-sales-sales-won-follow-up",
        expect.objectContaining({
          activate: true,
          overwriteExisting: false,
        }),
      );
      expect(result).toEqual({
        outcome: "installed",
        workflow: {
          id: "wf-template",
          templateKey: "new-sales-sales-won-follow-up",
        },
      });
    });
  });

  describe("getRuns", () => {
    it("returns recent workflow runs", async () => {
      mockFindById.mockResolvedValue({
        id: "w1",
        name: "Follow-up",
        pipelineId: "p1",
        tenantId,
      });
      mockFindRecentRuns.mockResolvedValue([
        { id: "run-1", status: "SUCCEEDED" },
      ]);

      const result = await workflowService.getRuns(tenantId, "w1", {
        limit: 10,
      });

      expect(mockFindRecentRuns).toHaveBeenCalledWith(tenantId, "w1", 10);
      expect(result).toEqual({
        runs: [{ id: "run-1", status: "SUCCEEDED" }],
      });
    });
  });
});
