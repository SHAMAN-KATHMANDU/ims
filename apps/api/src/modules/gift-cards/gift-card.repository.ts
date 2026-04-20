import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export type GiftCardStatusValue = "ACTIVE" | "REDEEMED" | "EXPIRED" | "VOIDED";

export interface GiftCardWhere {
  tenantId: string;
  status?: GiftCardStatusValue;
  OR?: Array<
    | { code: { contains: string; mode: "insensitive" } }
    | { recipientEmail: { contains: string; mode: "insensitive" } }
  >;
}

export interface CreateGiftCardRepoData {
  tenantId: string;
  code: string;
  amount: number;
  balance: number;
  purchaserId: string | null;
  recipientEmail: string | null;
  expiresAt: Date | null;
  status: GiftCardStatusValue;
}

export interface UpdateGiftCardRepoData {
  recipientEmail?: string | null;
  expiresAt?: Date | null;
  status?: GiftCardStatusValue;
  balance?: number;
}

const listSelect = {
  id: true,
  code: true,
  amount: true,
  balance: true,
  status: true,
  recipientEmail: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class GiftCardRepository {
  async findFirstByCode(tenantId: string, code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return null;
    return prisma.giftCard.findFirst({
      where: { tenantId, code: trimmed },
      select: { id: true, code: true },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.giftCard.findFirst({ where: { id, tenantId } });
  }

  async findActiveByCode(tenantId: string, code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return null;
    return prisma.giftCard.findFirst({
      where: { tenantId, code: trimmed },
    });
  }

  async count(where: GiftCardWhere): Promise<number> {
    return prisma.giftCard.count({ where });
  }

  async findMany(
    where: GiftCardWhere,
    orderBy: Record<string, "asc" | "desc">,
    skip: number,
    take: number,
  ) {
    return prisma.giftCard.findMany({
      where,
      orderBy,
      skip,
      take,
      select: listSelect,
    });
  }

  async create(data: CreateGiftCardRepoData) {
    return prisma.giftCard.create({
      data: {
        tenantId: data.tenantId,
        code: data.code,
        amount: data.amount,
        balance: data.balance,
        purchaserId: data.purchaserId,
        recipientEmail: data.recipientEmail,
        expiresAt: data.expiresAt,
        status: data.status,
      },
    });
  }

  async update(id: string, data: UpdateGiftCardRepoData) {
    return prisma.giftCard.update({
      where: { id },
      data: data as Prisma.GiftCardUpdateInput,
    });
  }

  /**
   * Atomic redeem: decrements balance by `amount` iff current balance >= amount
   * AND status = ACTIVE AND (expiresAt IS NULL OR expiresAt > now). Returns
   * updated row on success; null if preconditions failed (caller should 409).
   */
  async redeem(
    tenantId: string,
    code: string,
    amount: number,
  ): Promise<{
    id: string;
    code: string;
    balance: number;
    status: GiftCardStatusValue;
  } | null> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return null;
    return prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findFirst({
        where: { tenantId, code: trimmed },
        select: {
          id: true,
          balance: true,
          status: true,
          expiresAt: true,
        },
      });
      if (!card) return null;
      if (card.status !== "ACTIVE") return null;
      if (card.expiresAt !== null && card.expiresAt.getTime() <= Date.now()) {
        return null;
      }
      if (card.balance < amount) return null;

      const newBalance = card.balance - amount;
      const newStatus: GiftCardStatusValue =
        newBalance === 0 ? "REDEEMED" : "ACTIVE";
      const updated = await tx.giftCard.update({
        where: { id: card.id },
        data: { balance: newBalance, status: newStatus },
        select: { id: true, code: true, balance: true, status: true },
      });
      return updated;
    });
  }
}

export default new GiftCardRepository();
