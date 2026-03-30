import { describe, it, expect } from "vitest";
import { CreateContactAttachmentSchema } from "./contact-attachment.schema";

describe("contact-attachment.schema", () => {
  it("accepts valid payload", () => {
    const r = CreateContactAttachmentSchema.safeParse({
      storageKey: "tenants/t/contacts/c/x.pdf",
      publicUrl:
        "https://bucket.s3.region.amazonaws.com/tenants/t/contacts/c/x.pdf",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
    });
    expect(r.success).toBe(true);
  });

  it("accepts payload without publicUrl", () => {
    const r = CreateContactAttachmentSchema.safeParse({
      storageKey:
        "dev/tenants/123e4567-e89b-12d3-a456-426614174000/contacts/223e4567-e89b-12d3-a456-426614174001/x.pdf",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
    });
    expect(r.success).toBe(true);
  });
});
