import { describe, it, expect } from "vitest";
import {
  PresignBodySchema,
  RegisterMediaAssetSchema,
  ListMediaQuerySchema,
  MediaAssetIdParamsSchema,
  UpdateMediaAssetSchema,
} from "./media.schema";

describe("media.schema", () => {
  it("PresignBodySchema accepts product_photo with contentLength", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "product_photo",
      mimeType: "image/png",
      contentLength: 100,
    });
    expect(r.success).toBe(true);
  });

  it("PresignBodySchema rejects when contentLength exceeds purpose max", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "product_photo",
      mimeType: "image/png",
      contentLength: 20 * 1024 * 1024,
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema requires entityId for contact_attachment", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
      contentLength: 1,
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema accepts contact_attachment with UUID entityId", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
      contentLength: 500,
      entityId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
    });
    expect(r.success).toBe(true);
  });

  it("PresignBodySchema requires entityId for message_media", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "message_media",
      mimeType: "video/mp4",
      contentLength: 100,
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema accepts message_media with conversation UUID", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "message_media",
      mimeType: "image/png",
      contentLength: 500,
      entityId: "cccccccc-cccc-4ccc-a000-cccccccccccc",
    });
    expect(r.success).toBe(true);
  });

  it("PresignBodySchema rejects when contentLength exceeds message_media max", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "message_media",
      mimeType: "video/mp4",
      contentLength: 30 * 1024 * 1024,
      entityId: "cccccccc-cccc-4ccc-a000-cccccccccccc",
    });
    expect(r.success).toBe(false);
  });

  it("RegisterMediaAssetSchema allows omitting publicUrl", () => {
    const r = RegisterMediaAssetSchema.safeParse({
      storageKey: "k",
      fileName: "a.png",
      mimeType: "image/png",
      purpose: "library",
    });
    expect(r.success).toBe(true);
  });

  it("RegisterMediaAssetSchema validates publicUrl when provided", () => {
    expect(
      RegisterMediaAssetSchema.safeParse({
        storageKey: "k",
        publicUrl: "not-a-url",
        fileName: "a.png",
        mimeType: "image/png",
        purpose: "library",
      }).success,
    ).toBe(false);
  });

  it("ListMediaQuerySchema defaults limit", () => {
    const r = ListMediaQuerySchema.parse({});
    expect(r.limit).toBe(20);
  });

  it("ListMediaQuerySchema accepts purpose and mimePrefix", () => {
    const r = ListMediaQuerySchema.parse({
      purpose: "message_media",
      mimePrefix: "image/",
    });
    expect(r.purpose).toBe("message_media");
    expect(r.mimePrefix).toBe("image/");
  });

  it("UpdateMediaAssetSchema accepts valid fileName", () => {
    const r = UpdateMediaAssetSchema.safeParse({ fileName: "photo.png" });
    expect(r.success).toBe(true);
  });

  it("UpdateMediaAssetSchema rejects empty fileName", () => {
    const r = UpdateMediaAssetSchema.safeParse({ fileName: "" });
    expect(r.success).toBe(false);
  });

  it("UpdateMediaAssetSchema rejects fileName over 255 chars", () => {
    const r = UpdateMediaAssetSchema.safeParse({ fileName: "x".repeat(256) });
    expect(r.success).toBe(false);
  });

  it("UpdateMediaAssetSchema trims fileName", () => {
    const r = UpdateMediaAssetSchema.safeParse({ fileName: "  photo.png  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fileName).toBe("photo.png");
  });

  it("UpdateMediaAssetSchema rejects whitespace-only fileName", () => {
    const r = UpdateMediaAssetSchema.safeParse({ fileName: "   \t  " });
    expect(r.success).toBe(false);
  });

  it("MediaAssetIdParamsSchema accepts UUID id", () => {
    const r = MediaAssetIdParamsSchema.safeParse({
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });
    expect(r.success).toBe(true);
  });

  it("MediaAssetIdParamsSchema rejects invalid id", () => {
    expect(MediaAssetIdParamsSchema.safeParse({ id: "not-uuid" }).success).toBe(
      false,
    );
  });
});
