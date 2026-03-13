import { basePrisma } from "@/config/prisma";

export class PasswordResetRepository {
  async findForTenant(tenantId: string) {
    return basePrisma.passwordResetRequest.findMany({
      where: { tenantId, status: "PENDING" },
      include: {
        requestedBy: {
          select: { id: true, username: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findEscalated() {
    return basePrisma.passwordResetRequest.findMany({
      where: { status: "ESCALATED" },
      include: {
        requestedBy: {
          select: { id: true, username: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return basePrisma.passwordResetRequest.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, username: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async escalate(id: string) {
    return basePrisma.passwordResetRequest.update({
      where: { id },
      data: { status: "ESCALATED" },
      include: {
        requestedBy: { select: { id: true, username: true, role: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async approve(
    id: string,
    handledById: string,
    hashedPassword: string,
  ): Promise<void> {
    await basePrisma.$transaction(async (tx) => {
      const req = await tx.passwordResetRequest.findUnique({
        where: { id },
        include: { requestedBy: true },
      });
      if (!req || (req.status !== "PENDING" && req.status !== "ESCALATED")) {
        throw new Error("Request not found or already handled");
      }
      await tx.user.update({
        where: { id: req.requestedById },
        data: { password: hashedPassword },
      });
      await tx.passwordResetRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          handledById,
          handledAt: new Date(),
        },
      });
    });
  }

  async reject(id: string, handledById: string) {
    return basePrisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        handledById,
        handledAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, username: true, role: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}

export default new PasswordResetRepository();
