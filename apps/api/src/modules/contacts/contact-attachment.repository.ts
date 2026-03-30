import prisma from "@/config/prisma";
import type { ContactAttachment } from "@prisma/client";

export class ContactAttachmentRepository {
  async findContactInTenant(
    contactId: string,
    tenantId: string,
  ): Promise<{ id: string } | null> {
    return prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true },
    });
  }

  async create(data: {
    contactId: string;
    fileName: string;
    filePath: string;
    storageKey: string;
    publicUrl: string;
    fileSize: number | null;
    mimeType: string;
    uploadedById: string;
  }): Promise<ContactAttachment> {
    return prisma.contactAttachment.create({
      data: {
        contactId: data.contactId,
        fileName: data.fileName,
        filePath: data.filePath,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedById: data.uploadedById,
      },
      include: { uploader: { select: { id: true, username: true } } },
    });
  }

  async findByIdForContact(
    attachmentId: string,
    contactId: string,
  ): Promise<ContactAttachment | null> {
    return prisma.contactAttachment.findFirst({
      where: { id: attachmentId, contactId },
    });
  }

  async deleteById(attachmentId: string): Promise<void> {
    await prisma.contactAttachment.delete({ where: { id: attachmentId } });
  }
}
