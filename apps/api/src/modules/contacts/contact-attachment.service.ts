import fs from "fs";
import path from "path";
import { env } from "@/config/env";
import { buildPublicUrl, keyMatchesContactPrefix } from "@/lib/s3/s3Key";
import { isClientPublicUrlCompatible } from "@/lib/s3/publicUrl";
import {
  deleteS3Object,
  isS3CredentialsOrPermissionError,
} from "@/lib/s3/s3Storage";
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
    const keyOpts = { allowLegacyKeys: env.photosAllowLegacyKeys };
    if (
      !keyMatchesContactPrefix(
        body.storageKey,
        tenantId,
        contactId,
        env.photosS3KeyPrefix,
        keyOpts,
      )
    ) {
      throw createError("Storage key does not match this contact", 400);
    }
    if (!env.photosS3Configured) {
      throw createError("Object storage is not configured", 503);
    }
    const canonicalPublicUrl = buildPublicUrl(
      body.storageKey,
      env.photosPublicUrlPrefix,
    );
    if (
      !isClientPublicUrlCompatible(
        body.storageKey,
        body.publicUrl,
        env.photosPublicUrlPrefix,
        env.photosPublicUrlAliases,
      )
    ) {
      throw createError(
        "publicUrl does not match storage key and configured public URL prefix (or aliases)",
        400,
      );
    }
    return this.repo.create({
      contactId,
      fileName: body.fileName,
      filePath: `s3:${body.storageKey}`.slice(0, 500),
      storageKey: body.storageKey,
      publicUrl: canonicalPublicUrl,
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
      if (!env.photosS3Configured) {
        throw createError(
          "Object storage is not configured; cannot delete stored attachment",
          503,
        );
      }
      try {
        await deleteS3Object(attachment.storageKey);
      } catch (e: unknown) {
        if (isS3CredentialsOrPermissionError(e)) {
          throw createError(
            "Object storage credentials or permissions are invalid",
            503,
          );
        }
        throw createError("Object storage delete failed; try again later", 502);
      }
    } else {
      const fullPath = path.join(process.cwd(), "uploads", attachment.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await this.repo.deleteById(attachmentId);
  }
}
