import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./workflow.service", () => ({
  default: {
    getAll: vi.fn(),
    getByPipeline: vi.fn(),
    getById: vi.fn(),
    getTemplateCatalog: vi.fn(),
    installTemplate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRuns: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import workflowController from "./workflow.controller";
import * as serviceModule from "./workflow.service";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function makeAppError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

describe("WorkflowController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns 200 with workflows on success (no query)", async () => {
      const workflows = [{ id: "w1", name: "Follow-up", pipelineId: "p1" }];
      mockService.getAll.mockResolvedValue({ workflows });
      const req = makeReq();
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(mockService.getAll).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "OK", workflows }),
      );
    });

    it("returns 200 with workflows and pagination when page/limit provided", async () => {
      const workflows = [{ id: "w1", name: "Follow-up", pipelineId: "p1" }];
      const pagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      };
      mockService.getAll.mockResolvedValue({ workflows, pagination });
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(mockService.getAll).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "OK",
        workflows,
        pagination,
      });
    });

    it("returns 200 with workflows when pipelineId query is valid", async () => {
      const workflows = [{ id: "w1", name: "Follow-up", pipelineId: "p1" }];
      mockService.getByPipeline.mockResolvedValue(workflows);
      const req = makeReq({
        query: { pipelineId: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(mockService.getByPipeline).toHaveBeenCalledWith(
        "t1",
        "00000000-0000-0000-0000-000000000001",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ workflows }),
      );
    });

    it("returns 400 when pipelineId is invalid UUID", async () => {
      const req = makeReq({ query: { pipelineId: "not-a-uuid" } });
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getAll).not.toHaveBeenCalled();
      expect(mockService.getByPipeline).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getAll.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAll pagination", () => {
    it("passes query with page and limit to service when provided", async () => {
      mockService.getAll.mockResolvedValue({
        workflows: [],
        pagination: {
          currentPage: 2,
          totalPages: 5,
          totalItems: 50,
          itemsPerPage: 10,
          hasNextPage: true,
          hasPrevPage: true,
        },
      });
      const req = makeReq({ query: { page: "2", limit: "10" } });
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(mockService.getAll).toHaveBeenCalledWith("t1", {
        pipelineId: undefined,
        page: 2,
        limit: 10,
      });
    });
  });

  describe("getById", () => {
    it("returns 200 with workflow on success", async () => {
      const workflow = { id: "w1", name: "Follow-up", pipelineId: "p1" };
      mockService.getById.mockResolvedValue(workflow);
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.getById(req, res);

      expect(mockService.getById).toHaveBeenCalledWith(
        "t1",
        "00000000-0000-0000-0000-000000000001",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "OK", workflow }),
      );
    });

    it("returns 404 when workflow not found", async () => {
      mockService.getById.mockRejectedValue(
        makeAppError("Workflow not found", 404),
      );
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Workflow not found" }),
      );
    });

    it("returns 400 when id is invalid UUID", async () => {
      const req = makeReq({ params: { id: "invalid" } });
      const res = mockRes() as Response;

      await workflowController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getById).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getById.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.getById(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getTemplates", () => {
    it("returns 200 with workflow templates", async () => {
      const templates = [
        { templateKey: "new-sales-sales-won-follow-up", isInstalled: false },
      ];
      mockService.getTemplateCatalog.mockResolvedValue(templates);
      const req = makeReq();
      const res = mockRes() as Response;

      await workflowController.getTemplates(req, res);

      expect(mockService.getTemplateCatalog).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ templates }),
      );
    });
  });

  describe("installTemplate", () => {
    it("returns 201 with installed workflow on success", async () => {
      const workflow = {
        id: "wf1",
        templateKey: "new-sales-sales-won-follow-up",
      };
      mockService.installTemplate.mockResolvedValue(workflow);
      const req = makeReq({
        params: { templateKey: "new-sales-sales-won-follow-up" },
        body: {
          pipelineId: "00000000-0000-0000-0000-000000000001",
          overwriteExisting: true,
        },
      });
      const res = mockRes() as Response;

      await workflowController.installTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Workflow template installed successfully",
          workflow,
        }),
      );
    });
  });

  describe("create", () => {
    it("returns 201 with created workflow on success", async () => {
      const workflow = {
        id: "w1",
        name: "Follow-up",
        pipelineId: "00000000-0000-0000-0000-000000000001",
        isActive: true,
      };
      mockService.create.mockResolvedValue(workflow);
      const req = makeReq({
        body: {
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Follow-up",
        },
      });
      const res = mockRes() as Response;

      await workflowController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Workflow created successfully",
          workflow,
        }),
      );
    });

    it("returns 400 when body fails Zod validation", async () => {
      const req = makeReq({ body: { name: "No pipelineId" } });
      const res = mockRes() as Response;

      await workflowController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns correct status when service throws AppError", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("Workflow with this name already exists", 409),
      );
      const req = makeReq({
        body: {
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Follow-up",
        },
      });
      const res = mockRes() as Response;

      await workflowController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Workflow with this name already exists",
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: {
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Follow-up",
        },
      });
      const res = mockRes() as Response;

      await workflowController.create(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("returns 200 with updated workflow on success", async () => {
      const workflow = {
        id: "w1",
        name: "Updated",
        pipelineId: "p1",
        isActive: false,
      };
      mockService.update.mockResolvedValue(workflow);
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
        body: { name: "Updated", isActive: false },
      });
      const res = mockRes() as Response;

      await workflowController.update(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "00000000-0000-0000-0000-000000000001",
        expect.objectContaining({ name: "Updated", isActive: false }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Workflow updated successfully",
          workflow,
        }),
      );
    });

    it("returns 400 when params id is invalid UUID", async () => {
      const req = makeReq({
        params: { id: "invalid" },
        body: { name: "Updated" },
      });
      const res = mockRes() as Response;

      await workflowController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 404 when workflow not found", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Workflow not found", 404),
      );
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
        body: { name: "Updated" },
      });
      const res = mockRes() as Response;

      await workflowController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Workflow not found" }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.update.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
        body: { name: "Updated" },
      });
      const res = mockRes() as Response;

      await workflowController.update(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("returns 200 on success", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.delete(req, res);

      expect(mockService.delete).toHaveBeenCalledWith(
        "t1",
        "00000000-0000-0000-0000-000000000001",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Workflow deleted successfully" }),
      );
    });

    it("returns 404 when workflow not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Workflow not found", 404),
      );
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Workflow not found" }),
      );
    });

    it("returns 400 when id is invalid UUID", async () => {
      const req = makeReq({ params: { id: "invalid" } });
      const res = mockRes() as Response;

      await workflowController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.delete.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await workflowController.delete(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getRuns", () => {
    it("returns 200 with workflow runs", async () => {
      const runs = [{ id: "run-1", status: "SUCCEEDED" }];
      mockService.getRuns.mockResolvedValue({ runs });
      const req = makeReq({
        params: { id: "00000000-0000-0000-0000-000000000001" },
        query: { limit: "5" },
      });
      const res = mockRes() as Response;

      await workflowController.getRuns(req, res);

      expect(mockService.getRuns).toHaveBeenCalledWith(
        "t1",
        "00000000-0000-0000-0000-000000000001",
        { limit: 5 },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ runs }));
    });
  });
});
