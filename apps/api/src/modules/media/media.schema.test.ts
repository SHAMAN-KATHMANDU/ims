import { describe, it, expect } from "vitest";
import {
  PresignBodySchema,
  RegisterMediaAssetSchema,
  ListMediaQuerySchema,
} from "./media.schema";

describe("media.schema", () => {
  it("PresignBodySchema accepts product_photo without entityId", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "product_photo",
      mimeType: "image/png",
    });
    expect(r.success).toBe(true);
  });

  it("PresignBodySchema requires entityId for contact_attachment", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
    });
    expect(r.success).toBe(false);
  });

  it("PresignBodySchema accepts contact_attachment with UUID entityId", () => {
    const r = PresignBodySchema.safeParse({
      purpose: "contact_attachment",
      mimeType: "application/pdf",
      entityId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
    });
    expect(r.success).toBe(true);
  });

  it("RegisterMediaAssetSchema validates url", () => {
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
});
