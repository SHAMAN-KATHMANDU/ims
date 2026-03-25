import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./deal.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getByPipeline: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    updateStage: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import dealController from "./deal.controller";
import * as dealServiceModule from "./deal.service";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = dealServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

describe("DealController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with deal on success", async () => {
      const deal = { id: "1", name: "Deal 1" };
      mockService.create.mockResolvedValue(deal);
      const req = makeReq({ body: { name: "Deal 1" } });
      const res = mockRes() as Response;

      await dealController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deal }));
    });
  });

  describe("getById", () => {
    it("returns 404 when deal not found", async () => {
      const err = new Error("Deal not found") as Error & { statusCode: number };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await dealController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("update", () => {
    it("calls service with tenantId, id, body, and userId and returns 200 with deal", async () => {
      const deal = { id: "2", name: "Updated Deal", revisionNo: 2 };
      mockService.update.mockResolvedValue(deal);
      const req = makeReq({
        params: { id: "1" },
        body: { name: "Updated Deal", editReason: "Corrected value" },
      });
      const res = mockRes() as Response;

      await dealController.update(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "1",
        expect.objectContaining({
          name: "Updated Deal",
          editReason: "Corrected value",
        }),
        "u1",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Deal updated successfully", deal }),
      );
    });
  });

  describe("updateStage", () => {
    it("calls service with tenantId, id, body, and userId and returns 200 with deal", async () => {
      const deal = { id: "2", stage: "Proposal", revisionNo: 2 };
      mockService.updateStage.mockResolvedValue(deal);
      const req = makeReq({
        params: { id: "1" },
        body: { stage: "Proposal" },
      });
      const res = mockRes() as Response;

      await dealController.updateStage(req, res);

      expect(mockService.updateStage).toHaveBeenCalledWith(
        "t1",
        "1",
        { stage: "Proposal" },
        "u1",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Deal stage updated", deal }),
      );
    });

    it("passes optional pipelineId to the service", async () => {
      const deal = { id: "2", stage: "Qualification", pipelineId: "p2" };
      mockService.updateStage.mockResolvedValue(deal);
      const req = makeReq({
        params: { id: "1" },
        body: {
          stage: "Qualification",
          pipelineId: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await dealController.updateStage(req, res);

      expect(mockService.updateStage).toHaveBeenCalledWith(
        "t1",
        "1",
        {
          stage: "Qualification",
          pipelineId: "550e8400-e29b-41d4-a716-446655440000",
        },
        "u1",
      );
    });
  });

  describe("delete", () => {
    it("calls service with tenantId, id, and delete context and returns 200", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({
        params: { id: "1" },
        body: { reason: "Duplicate" },
      });
      const res = mockRes() as Response;

      await dealController.delete(req, res);

      expect(mockService.delete).toHaveBeenCalledWith(
        "t1",
        "1",
        expect.objectContaining({ userId: "u1", reason: "Duplicate" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Deal deleted successfully" }),
      );
    });
  });
});
