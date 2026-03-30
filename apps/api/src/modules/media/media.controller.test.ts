import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { MediaAsset } from "@prisma/client";

const hoisted = vi.hoisted(() => ({
  updateAsset: vi.fn(),
  presign: vi.fn(),
  registerAsset: vi.fn(),
  listAssets: vi.fn(),
  deleteAsset: vi.fn(),
}));

vi.mock("./media.service", () => ({
  MediaService: class MockMediaService {
    updateAsset = hoisted.updateAsset;
    presign = hoisted.presign;
    registerAsset = hoisted.registerAsset;
    listAssets = hoisted.listAssets;
    deleteAsset = hoisted.deleteAsset;
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import mediaController from "./media.controller";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";
import { createError } from "@/middlewares/errorHandler";

function assetStub(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    tenantId: "t1",
    storageKey: "k",
    publicUrl: "https://example.com/o",
    fileName: "photo.png",
    mimeType: "image/png",
    byteSize: 100,
    purpose: "library",
    uploadedById: "u1",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  } as MediaAsset;
}

describe("MediaController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateMediaAsset", () => {
    it("returns 200 with asset on success", async () => {
      const asset = assetStub({ fileName: "new-name.png" });
      hoisted.updateAsset.mockResolvedValue(asset);
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "new-name.png" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(hoisted.updateAsset).toHaveBeenCalledWith(
        "t1",
        "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        {
          fileName: "new-name.png",
        },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { asset },
      });
    });

    it("returns 400 when fileName is empty (Zod)", async () => {
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(hoisted.updateAsset).not.toHaveBeenCalled();
    });

    it("returns 404 when service throws AppError", async () => {
      hoisted.updateAsset.mockRejectedValue(
        createError("Media asset not found", 404),
      );
      const req = makeReq({
        params: { id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" },
        body: { fileName: "x.png" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Media asset not found",
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      hoisted.updateAsset.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "x.png" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
