import { describe, it, expect, vi, beforeEach } from "vitest";
import { mediaService, type MediaAsset } from "./media.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((_error) => {
    throw new Error("API Error");
  }),
}));

import api from "@/lib/axios";

describe("mediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("presignUpload", () => {
    it("returns presign result with URL and key", async () => {
      const mockResult = {
        presignedUrl: "https://s3.example.com/presigned",
        key: "media/12345.jpg",
        publicUrl: "https://cdn.example.com/media/12345.jpg",
      };

      vi.mocked(api.post).mockResolvedValueOnce({ data: mockResult });

      const result = await mediaService.presignUpload({
        purpose: "library",
        mimeType: "image/jpeg",
        contentLength: 1024,
        fileName: "test.jpg",
      });

      expect(result).toEqual(mockResult);
      expect(api.post).toHaveBeenCalledWith(
        "/media/presign",
        expect.any(Object),
      );
    });
  });

  describe("registerAsset", () => {
    it("registers an asset successfully", async () => {
      const mockAsset: MediaAsset = {
        id: "asset-123",
        tenantId: "tenant-1",
        storageKey: "media/12345.jpg",
        publicUrl: "https://cdn.example.com/media/12345.jpg",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        purpose: "library",
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.post).mockResolvedValueOnce({ data: { asset: mockAsset } });

      const result = await mediaService.registerAsset({
        storageKey: "media/12345.jpg",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        purpose: "library",
      });

      expect(result).toEqual(mockAsset);
    });
  });

  describe("listAssets", () => {
    it("returns list of assets", async () => {
      const mockAssets: MediaAsset[] = [
        {
          id: "asset-1",
          tenantId: "tenant-1",
          storageKey: "media/1.jpg",
          publicUrl: "https://cdn.example.com/media/1.jpg",
          fileName: "image1.jpg",
          mimeType: "image/jpeg",
          purpose: "library",
          createdAt: "2026-05-09T00:00:00Z",
          updatedAt: "2026-05-09T00:00:00Z",
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { items: mockAssets, nextCursor: undefined },
      });

      const result = await mediaService.listAssets();

      expect(result.items).toEqual(mockAssets);
      expect(api.get).toHaveBeenCalledWith("/media/assets", expect.any(Object));
    });
  });

  describe("updateAsset", () => {
    it("updates asset display name", async () => {
      const mockAsset: MediaAsset = {
        id: "asset-123",
        tenantId: "tenant-1",
        storageKey: "media/12345.jpg",
        publicUrl: "https://cdn.example.com/media/12345.jpg",
        fileName: "updated.jpg",
        mimeType: "image/jpeg",
        purpose: "library",
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        data: { asset: mockAsset },
      });

      const result = await mediaService.updateAsset("asset-123", {
        fileName: "updated.jpg",
      });

      expect(result.fileName).toBe("updated.jpg");
      expect(api.patch).toHaveBeenCalledWith("/media/assets/asset-123", {
        fileName: "updated.jpg",
      });
    });
  });

  describe("deleteAsset", () => {
    it("deletes an asset", async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({});

      await mediaService.deleteAsset("asset-123");

      expect(api.delete).toHaveBeenCalledWith("/media/assets/asset-123");
    });
  });

  describe("uploadToS3", () => {
    it("uploads file to S3 via XMLHttpRequest", async () => {
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });

      const mockXhr = {
        upload: { addEventListener: vi.fn() },
        addEventListener: vi.fn(),
        setRequestHeader: vi.fn(),
        open: vi.fn(),
        send: vi.fn(),
        status: 200,
      };

      vi.stubGlobal(
        "XMLHttpRequest",
        vi.fn(function () {
          return mockXhr;
        }),
      );

      const promise = mediaService.uploadToS3(
        "https://s3.example.com/presigned",
        file,
        undefined,
      );

      const loadListener = (
        mockXhr.addEventListener as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.find(
        (call: unknown[]) => (call as unknown[])[0] === "load",
      )?.[1];
      if (loadListener) (loadListener as () => void)();

      await promise;

      expect(mockXhr.open).toHaveBeenCalledWith(
        "PUT",
        "https://s3.example.com/presigned",
      );
      expect(mockXhr.send).toHaveBeenCalledWith(file);

      vi.unstubAllGlobals();
    });
  });

  describe("uploadFile", () => {
    it("chains presign, upload, and register", async () => {
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      const mockAsset: MediaAsset = {
        id: "asset-123",
        tenantId: "tenant-1",
        storageKey: "media/12345.jpg",
        publicUrl: "https://cdn.example.com/media/12345.jpg",
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        purpose: "library",
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.spyOn(mediaService, "presignUpload").mockResolvedValueOnce({
        presignedUrl: "https://s3.example.com/presigned",
        key: "media/12345.jpg",
        publicUrl: "https://cdn.example.com/media/12345.jpg",
      });

      vi.spyOn(mediaService, "uploadToS3").mockResolvedValueOnce();

      vi.spyOn(mediaService, "registerAsset").mockResolvedValueOnce(mockAsset);

      const result = await mediaService.uploadFile(file, "library");

      expect(result).toEqual(mockAsset);
      expect(mediaService.presignUpload).toHaveBeenCalled();
      expect(mediaService.uploadToS3).toHaveBeenCalled();
      expect(mediaService.registerAsset).toHaveBeenCalled();
    });
  });
});
