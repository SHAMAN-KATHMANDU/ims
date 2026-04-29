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

  it("presign returns key under messages/{conversationId} for message_media", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const convId = "aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa";
    const svc = new MediaService(new MediaRepository());
    const out = await svc.presign(tenantId, {
      purpose: "message_media",
      mimeType: "video/mp4",
      fileName: "clip.mp4",
      contentLength: 1024,
      entityId: convId,
    });
    expect(out.key).toContain(`dev/tenants/${tenantId}/messages/${convId}/`);
    expect(out.contentType).toBe("video/mp4");
  });

  it("deleteAsset throws 409 when asset is linked to a contact attachment", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const storageKey = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue({
        id: "asset-1",
        tenantId,
        storageKey,
        publicUrl: `https://test-bucket.s3.ap-south-1.amazonaws.com/${storageKey}`,
      }),
      countContactAttachmentsByMediaAssetId: vi.fn().mockResolvedValue(1),
      countMessagesByMediaAssetId: vi.fn().mockResolvedValue(0),
      countSiteLayoutsReferencingAsset: vi.fn().mockResolvedValue(0),
      softDeleteByIdForTenant: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(svc.deleteAsset(tenantId, "asset-1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repo.softDeleteByIdForTenant).not.toHaveBeenCalled();
  });

  it("deleteAsset throws 409 when asset is referenced by a SiteLayout block", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const storageKey = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const publicUrl = `https://test-bucket.s3.ap-south-1.amazonaws.com/${storageKey}`;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue({
        id: "asset-1",
        tenantId,
        storageKey,
        publicUrl,
      }),
      countContactAttachmentsByMediaAssetId: vi.fn().mockResolvedValue(0),
      countMessagesByMediaAssetId: vi.fn().mockResolvedValue(0),
      countSiteLayoutsReferencingAsset: vi.fn().mockResolvedValue(2),
      softDeleteByIdForTenant: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(svc.deleteAsset(tenantId, "asset-1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repo.countSiteLayoutsReferencingAsset).toHaveBeenCalledWith(
      tenantId,
      storageKey,
      publicUrl,
    );
    expect(repo.softDeleteByIdForTenant).not.toHaveBeenCalled();
  });

  it("deleteAsset soft-deletes when no references and never calls S3", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const storageKey = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue({
        id: "asset-1",
        tenantId,
        storageKey,
        publicUrl: `https://test-bucket.s3.ap-south-1.amazonaws.com/${storageKey}`,
      }),
      countContactAttachmentsByMediaAssetId: vi.fn().mockResolvedValue(0),
      countMessagesByMediaAssetId: vi.fn().mockResolvedValue(0),
      countSiteLayoutsReferencingAsset: vi.fn().mockResolvedValue(0),
      softDeleteByIdForTenant: vi.fn().mockResolvedValue(1),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await svc.deleteAsset(tenantId, "asset-1");
    expect(repo.softDeleteByIdForTenant).toHaveBeenCalledWith(
      "asset-1",
      tenantId,
    );
    // Soft-delete must NOT touch S3 — the object stays for recovery.
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deleteAsset throws 404 when soft-delete affects zero rows (race)", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const storageKey = `dev/tenants/${tenantId}/library/general/aaaaaaaa-bbbb-4ccc-bbbb-aaaaaaaaaaaa.png`;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue({
        id: "asset-1",
        tenantId,
        storageKey,
        publicUrl: `https://test-bucket.s3.ap-south-1.amazonaws.com/${storageKey}`,
      }),
      countContactAttachmentsByMediaAssetId: vi.fn().mockResolvedValue(0),
      countMessagesByMediaAssetId: vi.fn().mockResolvedValue(0),
      countSiteLayoutsReferencingAsset: vi.fn().mockResolvedValue(0),
      softDeleteByIdForTenant: vi.fn().mockResolvedValue(0),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(svc.deleteAsset(tenantId, "asset-1")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("deleteAsset throws 404 when asset not found for tenant (cross-tenant guard)", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue(null),
      softDeleteByIdForTenant: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(svc.deleteAsset(tenantId, "asset-1")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repo.softDeleteByIdForTenant).not.toHaveBeenCalled();
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

  it("updateAsset returns current row when display name unchanged", async () => {
    const row = {
      id: "asset-1",
      tenantId: "t1",
      fileName: "same.png",
    } as MediaAsset;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue(row),
      findByFileNameForTenantExcludingId: vi.fn(),
      updateFileNameForTenant: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    const out = await svc.updateAsset("t1", "asset-1", {
      fileName: "same.png",
    });
    expect(out).toBe(row);
    expect(repo.findByFileNameForTenantExcludingId).not.toHaveBeenCalled();
    expect(repo.updateFileNameForTenant).not.toHaveBeenCalled();
  });

  it("updateAsset throws 409 when another asset has the display name", async () => {
    const current = {
      id: "asset-1",
      tenantId: "t1",
      fileName: "old.png",
    } as MediaAsset;
    const other = {
      id: "asset-2",
      tenantId: "t1",
      fileName: "taken.png",
    } as MediaAsset;
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue(current),
      findByFileNameForTenantExcludingId: vi.fn().mockResolvedValue(other),
      updateFileNameForTenant: vi.fn(),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(
      svc.updateAsset("t1", "asset-1", { fileName: "taken.png" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.updateFileNameForTenant).not.toHaveBeenCalled();
  });

  it("updateAsset throws 404 when asset missing", async () => {
    const repo = {
      findByIdForTenant: vi.fn().mockResolvedValue(null),
    };
    const svc = new MediaService(repo as unknown as MediaRepository);
    await expect(
      svc.updateAsset("t1", "missing-id", { fileName: "x.png" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
