import { basePrisma } from "@/config/prisma";

const RESET_REQUEST_INCLUDE = {
  requestedBy: {
    select: { id: true, username: true, role: true },
  },
  tenant: {
    select: { id: true, name: true, slug: true },
  },
} as const;

export class PasswordResetRepository {
  async countForTenant(tenantId: string, search?: string) {
    const where: {
      tenantId: string;
      status: "PENDING";
      requestedBy?: { username: { contains: string; mode: "insensitive" } };
    } = { tenantId, status: "PENDING" };
    if (search) {
      where.requestedBy = {
        username: { contains: search, mode: "insensitive" },
      };
    }
    return basePrisma.passwordResetRequest.count({
      where,
    });
  }

  async findForTenant(tenantId: string) {
    return basePrisma.passwordResetRequest.findMany({
      where: { tenantId, status: "PENDING" },
      include: RESET_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findForTenantPaginated(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: {
      tenantId: string;
      status: "PENDING";
      requestedBy?: { username: { contains: string; mode: "insensitive" } };
    } = { tenantId, status: "PENDING" };
    if (search) {
      where.requestedBy = {
        username: { contains: search, mode: "insensitive" },
      };
    }
    return basePrisma.passwordResetRequest.findMany({
      where,
      include: RESET_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  async countEscalated(search?: string) {
    const where: {
      status: "ESCALATED";
      OR?: Array<
        | {
            requestedBy: {
              username: { contains: string; mode: "insensitive" };
            };
          }
        | {
            tenant: {
              OR: Array<
                | { name: { contains: string; mode: "insensitive" } }
                | { slug: { contains: string; mode: "insensitive" } }
              >;
            };
          }
      >;
    } = { status: "ESCALATED" };
    if (search) {
      where.OR = [
        {
          requestedBy: { username: { contains: search, mode: "insensitive" } },
        },
        {
          tenant: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }
    return basePrisma.passwordResetRequest.count({
      where,
    });
  }

  async findEscalated() {
    return basePrisma.passwordResetRequest.findMany({
      where: { status: "ESCALATED" },
      include: RESET_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findEscalatedPaginated(skip: number, take: number, search?: string) {
    const where: {
      status: "ESCALATED";
      OR?: Array<
        | {
            requestedBy: {
              username: { contains: string; mode: "insensitive" };
            };
          }
        | {
            tenant: {
              OR: Array<
                | { name: { contains: string; mode: "insensitive" } }
                | { slug: { contains: string; mode: "insensitive" } }
              >;
            };
          }
      >;
    } = { status: "ESCALATED" };
    if (search) {
      where.OR = [
        {
          requestedBy: { username: { contains: search, mode: "insensitive" } },
        },
        {
          tenant: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }
    return basePrisma.passwordResetRequest.findMany({
      where,
      include: RESET_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take,
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
