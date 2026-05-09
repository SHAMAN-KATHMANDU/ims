import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { MediaAsset } from "@prisma/client";

const hoisted = vi.hoisted(() => ({
  updateAsset: vi.fn(),
  presign: vi.fn(),
  registerAsset: vi.fn(),
  listAssets: vi.fn(),
  deleteAsset: vi.fn(),
  listFolders: vi.fn(),
  getConversation: vi.fn().mockResolvedValue({ id: "conv-1" }),
}));

vi.mock("./media.service", () => ({
  MediaService: class MockMediaService {
    updateAsset = hoisted.updateAsset;
    presign = hoisted.presign;
    registerAsset = hoisted.registerAsset;
    listAssets = hoisted.listAssets;
    deleteAsset = hoisted.deleteAsset;
    listFolders = hoisted.listFolders;
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

vi.mock("@/modules/messaging/messaging.service", () => ({
  default: {
    getConversation: hoisted.getConversation,
  },
}));

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
    deletedAt: null,
    altText: null,
    folder: null,
    ...overrides,
  } as MediaAsset;
}

describe("MediaController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("presign", () => {
    it("calls getConversation before presign for message_media", async () => {
      hoisted.presign.mockResolvedValue({
        uploadUrl: "https://signed",
        key: "k",
        publicUrl: "https://pub",
        contentType: "image/png",
        expiresAt: new Date().toISOString(),
        maxBytes: 1e6,
        requiresCompletion: true,
      });
      const req = makeReq({
        body: {
          purpose: "message_media",
          mimeType: "image/png",
          contentLength: 100,
          entityId: "aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa",
        },
      });
      const res = mockRes() as Response;

      await mediaController.presign(req, res);

      expect(hoisted.getConversation).toHaveBeenCalledWith(
        "t1",
        "aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa",
      );
      expect(hoisted.presign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
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
        { fileName: "new-name.png" },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { asset },
      });
    });

    it("passes trimmed fileName to service", async () => {
      const asset = assetStub({ fileName: "a.png" });
      hoisted.updateAsset.mockResolvedValue(asset);
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "  a.png  " },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(hoisted.updateAsset).toHaveBeenCalledWith(
        "t1",
        "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        { fileName: "a.png" },
      );
      expect(res.status).toHaveBeenCalledWith(200);
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

    it("returns 400 when id is not a valid UUID", async () => {
      const req = makeReq({
        params: { id: "not-a-uuid" },
        body: { fileName: "x.png" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(hoisted.updateAsset).not.toHaveBeenCalled();
    });

    it("returns 400 when fileName is whitespace-only (Zod)", async () => {
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "  \t  " },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(hoisted.updateAsset).not.toHaveBeenCalled();
    });

    it("returns 409 when name already exists for another asset", async () => {
      hoisted.updateAsset.mockRejectedValue(
        createError("Media asset name already exists", 409),
      );
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: { fileName: "taken.png" },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Media asset name already exists",
      });
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

    it("accepts altText and folder in update", async () => {
      const asset = assetStub({
        fileName: "photo.png",
        altText: "A sunset",
        folder: "Nature",
      });
      hoisted.updateAsset.mockResolvedValue(asset);
      const req = makeReq({
        params: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
        body: {
          fileName: "photo.png",
          altText: "A sunset",
          folder: "Nature",
        },
      });
      const res = mockRes() as Response;

      await mediaController.updateMediaAsset(req, res);

      expect(hoisted.updateAsset).toHaveBeenCalledWith(
        "t1",
        "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        {
          fileName: "photo.png",
          altText: "A sunset",
          folder: "Nature",
        },
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("listFolders", () => {
    it("returns 200 with folders list", async () => {
      hoisted.listFolders.mockResolvedValue(["Brand", "Designs", "Team"]);
      const req = makeReq({});
      const res = mockRes() as Response;

      await mediaController.listFolders(req, res);

      expect(hoisted.listFolders).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { folders: ["Brand", "Designs", "Team"] },
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      hoisted.listFolders.mockRejectedValue(new Error("DB error"));
      const req = makeReq({});
      const res = mockRes() as Response;

      await mediaController.listFolders(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
