import { describe, it, expect, vi, beforeEach } from "vitest";
import { MediaService } from "./media.service";
import { MediaRepository } from "./media.repository";

vi.mock("@/config/env", () => ({
  env: {
    photosS3Configured: true,
    awsRegion: "ap-south-1",
    photosS3Bucket: "test-bucket",
    photosPublicUrlPrefix: "https://test-bucket.s3.ap-south-1.amazonaws.com/",
    photosS3KeyPrefix: "dev",
  },
}));

const presignMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/lib/s3/s3Storage", () => ({
  presignPutObject: (...args: unknown[]) => presignMock(...args),
  deleteS3Object: (...args: unknown[]) => deleteMock(...args),
}));

describe("MediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    presignMock.mockResolvedValue({
      url: "https://signed.example/put",
      expiresAt: new Date().toISOString(),
    });
  });

  it("presign returns upload URL and public URL for product_photo", async () => {
    const tenantId = "123e4567-e89b-12d3-a456-426614174000";
    const svc = new MediaService(new MediaRepository());
    const out = await svc.presign(tenantId, {
      purpose: "product_photo",
      mimeType: "image/png",
      fileName: "x.png",
    });
    expect(out.uploadUrl).toBe("https://signed.example/put");
    expect(out.key).toContain(`dev/tenants/${tenantId}/products/draft/`);
    expect(out.publicUrl).toMatch(
      /^https:\/\/test-bucket\.s3\.ap-south-1\.amazonaws\.com\//,
    );
    expect(presignMock).toHaveBeenCalledOnce();
  });

  it("presign rejects disallowed mime for product_photo", async () => {
    const svc = new MediaService(new MediaRepository());
    await expect(
      svc.presign("123e4567-e89b-12d3-a456-426614174000", {
        purpose: "product_photo",
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow();
  });
});
