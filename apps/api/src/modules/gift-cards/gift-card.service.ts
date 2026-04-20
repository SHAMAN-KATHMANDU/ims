import { createError } from "@/middlewares/errorHandler";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import giftCardRepository, {
  type GiftCardRepository,
  type GiftCardWhere,
  type CreateGiftCardRepoData,
  type UpdateGiftCardRepoData,
  type GiftCardStatusValue,
} from "./gift-card.repository";
import type { CreateGiftCardDto, UpdateGiftCardDto } from "./gift-card.schema";

const ALLOWED_SORT_FIELDS = [
  "code",
  "amount",
  "balance",
  "createdAt",
  "updatedAt",
  "expiresAt",
] as const;

export class GiftCardService {
  constructor(private repo: GiftCardRepository) {}

  async create(tenantId: string, data: CreateGiftCardDto) {
    const existing = await this.repo.findFirstByCode(tenantId, data.code);
    if (existing) {
      throw createError("Gift card with this code already exists", 409);
    }
    const repoData: CreateGiftCardRepoData = {
      tenantId,
      code: data.code,
      amount: data.amount,
      balance: data.amount,
      purchaserId: data.purchaserId ?? null,
      recipientEmail: data.recipientEmail ?? null,
      expiresAt: data.expiresAt ?? null,
      status: data.status,
    };
    return this.repo.create(repoData);
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(rawQuery);

    const status =
      typeof rawQuery.status === "string"
        ? (rawQuery.status as GiftCardStatusValue)
        : undefined;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? { createdAt: "desc" };

    const where: GiftCardWhere = { tenantId };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { recipientEmail: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [totalItems, items] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany(where, orderBy, skip, limit),
    ]);
    return createPaginationResult(items, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, data: UpdateGiftCardDto) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) return null;

    const updateData: UpdateGiftCardRepoData = {};
    if (data.recipientEmail !== undefined)
      updateData.recipientEmail = data.recipientEmail ?? null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.balance !== undefined) {
      if (data.balance > existing.amount) {
        throw createError("Balance cannot exceed original amount", 400);
      }
      updateData.balance = data.balance;
    }

    if (Object.keys(updateData).length === 0) return existing;
    return this.repo.update(id, updateData);
  }

  /**
   * Public redeem. Returns redeemed card on success, throws:
   *   404 — code not found for tenant
   *   409 — insufficient balance, not ACTIVE, or expired
   */
  async redeem(tenantId: string, code: string, amount: number) {
    const card = await this.repo.findActiveByCode(tenantId, code);
    if (!card) throw createError("Gift card not found", 404);

    const updated = await this.repo.redeem(tenantId, code, amount);
    if (!updated) {
      if (card.status !== "ACTIVE") {
        throw createError(`Gift card is ${card.status.toLowerCase()}`, 409);
      }
      if (card.expiresAt !== null && card.expiresAt.getTime() <= Date.now()) {
        throw createError("Gift card is expired", 409);
      }
      throw createError("Insufficient gift card balance", 409);
    }
    return updated;
  }
}

export default new GiftCardService(giftCardRepository);
