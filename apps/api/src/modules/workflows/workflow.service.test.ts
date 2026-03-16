import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindAllByTenant = vi.fn();
const mockFindByPipeline = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("./workflow.repository", () => ({
  default: {
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    findByPipeline: (...args: unknown[]) => mockFindByPipeline(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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
});
