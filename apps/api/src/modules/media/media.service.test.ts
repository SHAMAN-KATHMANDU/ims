import { describe, it, expect, vi, beforeEach } from "vitest";
import { MediaService } from "./media.service";
import { MediaRepository } from "./media.repository";
import type { MediaAsset } from "@prisma/client";

vi.mock("@/config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    request: vi.fn(),
  },
}));

vi.mock("@/config/env", () => ({
  env: {
    photosS3Configured: true,
    awsRegion: "ap-south-1",
    photosS3Bucket: "test-bucket",
    photosPublicUrlPrefix: "https://test-bucket.s3.ap-south-1.amazonaws.com/",
    photosPublicUrlAliases: [] as string[],
    photosS3KeyPrefix: "dev",
    photosAllowLegacyKeys: false,
    photosEnforceContentSniff: false,
  },
}));

const presignMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/lib/s3/s3Storage", () => ({
  presignPutObject: (...args: unknown[]) => presignMock(...args),
  deleteS3Object: (...args: unknown[]) => deleteMock(...args),
  getS3ObjectFirstBytes: vi.fn(),
  verifyS3Connectivity: vi.fn(),
  isS3CredentialsOrPermissionError: () => false,
}));

describe("MediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    presignMock.mockResolvedValue({
      url: "https://signed.example/put",
      expiresAt: new Date().toISOString(),
    });
  });

  it("presign returns upload URL, public URL, and contentType for product_photo", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const svc = new MediaService(new MediaRepository());
    const out = await svc.presign(tenantId, {
      purpose: "product_photo",
      mimeType: "image/png",
      fileName: "x.png",
      contentLength: 1024,
    });
    expect(out.uploadUrl).toBe("https://signed.example/put");
    expect(out.key).toContain(`dev/tenants/${tenantId}/products/draft/`);
    expect(out.publicUrl).toMatch(
      /^https:\/\/test-bucket\.s3\.ap-south-1\.amazonaws\.com\//,
    );
    expect(out.contentType).toBe("image/png");
    expect(out.requiresCompletion).toBe(true);
    expect(presignMock).toHaveBeenCalledWith(
      expect.stringContaining(`dev/tenants/${tenantId}/products/draft/`),
      "image/png",
      1024,
    );
  });

  it("presign allows application/octet-stream when fileName implies allowed mime", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const svc = new MediaService(new MediaRepository());
    await svc.presign(tenantId, {
      purpose: "product_photo",
      mimeType: "application/octet-stream",
      fileName: "x.png",
      contentLength: 100,
    });
    expect(presignMock).toHaveBeenCalledWith(
      expect.any(String),
      "image/png",
      100,
    );
  });

  it("presign rejects disallowed mime for product_photo", async () => {
    const svc = new MediaService(new MediaRepository());
    await expect(
      svc.presign("123e4567-e89b-12d3-a456-426614174000", {
        purpose: "product_photo",
        mimeType: "application/pdf",
        contentLength: 10,
      }),
    ).rejects.toThrow();
  });

  it("presign rejects wrong entityType for library purpose", async () => {
    const svc = new MediaService(new MediaRepository());
    await expect(
      svc.presign("123e4567-e89b-12d3-a456-426614174000", {
        purpose: "library",
        mimeType: "application/pdf",
        fileName: "a.pdf",
        contentLength: 10,
        entityType: "products",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("deleteAsset does not remove DB row when S3 delete fails", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const storageKey = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue({
        id: "asset-1",
        tenantId,
        storageKey,
      }),
      deleteByIdForTenant: vi.fn(),
    };
    deleteMock.mockRejectedValue(new Error("S3 network"));

    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(svc.deleteAsset(tenantId, "asset-1")).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(repo.deleteByIdForTenant).not.toHaveBeenCalled();
  });

  it("registerAsset returns existing row when storageKey already registered", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const key = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const existing = {
      id: "existing-id",
      tenantId,
      storageKey: key,
      publicUrl: `https://test-bucket.s3.ap-south-1.amazonaws.com/${key}`,
    } as MediaAsset;
    const repo = {
      findByStorageKeyForTenant: vi.fn().mockResolvedValue(existing),
      create: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    const out = await svc.registerAsset(tenantId, "user-id", {
      storageKey: key,
      fileName: "f.png",
      mimeType: "image/png",
      purpose: "library",
    });
    expect(out.created).toBe(false);
    expect(out.asset).toBe(existing);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
