import fs from "fs";
import path from "path";
import { env } from "@/config/env";
import { buildPublicUrl, keyMatchesContactPrefix } from "@/lib/s3/s3Key";
import { deleteS3Object } from "@/lib/s3/s3Storage";
import { createError } from "@/middlewares/errorHandler";
import type { CreateContactAttachmentDto } from "./contact-attachment.schema";
import { ContactAttachmentRepository } from "./contact-attachment.repository";
import type { ContactAttachment } from "@prisma/client";

export class ContactAttachmentService {
  constructor(private readonly repo = new ContactAttachmentRepository()) {}

  async addS3Attachment(
    tenantId: string,
    userId: string,
    contactId: string,
    body: CreateContactAttachmentDto,
  ): Promise<
    ContactAttachment & { uploader?: { id: string; username: string } }
  > {
    const contact = await this.repo.findContactInTenant(contactId, tenantId);
    if (!contact) {
      throw createError("Contact not found", 404);
    }
    if (
      !keyMatchesContactPrefix(
        body.storageKey,
        tenantId,
        contactId,
        env.photosS3KeyPrefix,
      )
    ) {
      throw createError("Storage key does not match this contact", 400);
    }
    if (!env.photosS3Configured) {
      throw createError("Object storage is not configured", 503);
    }
    const expectedUrl = buildPublicUrl(
      body.storageKey,
      env.photosPublicUrlPrefix,
    );
    if (body.publicUrl !== expectedUrl) {
      throw createError("publicUrl does not match storage key", 400);
    }
    return this.repo.create({
      contactId,
      fileName: body.fileName,
      filePath: `s3:${body.storageKey}`.slice(0, 500),
      storageKey: body.storageKey,
      publicUrl: body.publicUrl,
      fileSize: body.fileSize ?? null,
      mimeType: body.mimeType,
      uploadedById: userId,
    });
  }

  async deleteAttachment(
    tenantId: string,
    contactId: string,
    attachmentId: string,
  ): Promise<void> {
    const contact = await this.repo.findContactInTenant(contactId, tenantId);
    if (!contact) {
      throw createError("Contact not found", 404);
    }
    const attachment = await this.repo.findByIdForContact(
      attachmentId,
      contactId,
    );
    if (!attachment) {
      throw createError("Attachment not found", 404);
    }
    if (attachment.storageKey) {
      await deleteS3Object(attachment.storageKey);
    } else {
      const fullPath = path.join(process.cwd(), "uploads", attachment.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await this.repo.deleteById(attachmentId);
  }
}
