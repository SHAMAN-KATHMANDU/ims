import { describe, it, expect, vi, beforeEach } from "vitest";
import { Response } from "express";

vi.mock("./trash.service", () => ({
  default: {
    list: vi.fn(),
    restore: vi.fn(),
    permanentlyDelete: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import trashController from "./trash.controller";
import * as trashServiceModule from "./trash.service";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = trashServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

describe("TrashController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTrash", () => {
    it("returns 200 with paginated trash items on success", async () => {
      const result = {
        message: "Trash items retrieved",
        data: [
          {
            entityType: "Product",
            id: "1",
            name: "Item",
            deletedAt: "",
            deletedBy: null,
            deleteReason: null,
            tenantId: "t1",
            tenantName: "Acme",
          },
        ],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
      };
      mockService.list.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await trashController.listTrash(req, res);

      expect(mockService.list).toHaveBeenCalledWith(expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it("returns 400 when entityType is invalid", async () => {
      const req = makeReq({ query: { entityType: "invalid" } });
      const res = mockRes() as Response;

      await trashController.listTrash(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
      );
      expect(mockService.list).not.toHaveBeenCalled();
    });

    it("returns service error status when service throws createError", async () => {
      const err = new Error("Invalid entityType") as Error & {
        statusCode: number;
      };
      err.statusCode = 400;
      mockService.list.mockRejectedValue(err);
      const req = makeReq();
      const res = mockRes() as Response;

      await trashController.listTrash(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid entityType",
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.list.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await trashController.listTrash(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("restoreItem", () => {
    it("returns 200 with success message on restore", async () => {
      mockService.restore.mockResolvedValue({ type: "Product" });
      const req = makeReq({
        params: {
          entityType: "product",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.restoreItem(req, res);

      expect(mockService.restore).toHaveBeenCalledWith(
        "product",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product restored successfully",
      });
    });

    it("returns 400 when entityType is invalid", async () => {
      const req = makeReq({
        params: {
          entityType: "invalid",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.restoreItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.restore).not.toHaveBeenCalled();
    });

    it("returns 400 when id is not a valid UUID", async () => {
      const req = makeReq({
        params: { entityType: "product", id: "not-a-uuid" },
      });
      const res = mockRes() as Response;

      await trashController.restoreItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.restore).not.toHaveBeenCalled();
    });

    it("returns 404 when item not found", async () => {
      const err = new Error("Item not found or not in trash") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.restore.mockRejectedValue(err);
      const req = makeReq({
        params: {
          entityType: "product",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.restoreItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Item not found or not in trash",
      });
    });
  });

  describe("permanentlyDeleteItem", () => {
    it("returns 200 with success message on permanent delete", async () => {
      mockService.permanentlyDelete.mockResolvedValue({ type: "Product" });
      const req = makeReq({
        params: {
          entityType: "product",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.permanentlyDeleteItem(req, res);

      expect(mockService.permanentlyDelete).toHaveBeenCalledWith(
        "product",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product permanently deleted",
      });
    });

    it("returns 400 when entityType is invalid", async () => {
      const req = makeReq({
        params: {
          entityType: "invalid",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.permanentlyDeleteItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.permanentlyDelete).not.toHaveBeenCalled();
    });

    it("returns 404 when item not found", async () => {
      const err = new Error("Item not found or not in trash") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.permanentlyDelete.mockRejectedValue(err);
      const req = makeReq({
        params: {
          entityType: "product",
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await trashController.permanentlyDeleteItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
