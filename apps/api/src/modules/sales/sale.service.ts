/**
 * Sale Service — Business logic for sale creation, preview, and calculation.
 * No Prisma, no req/res. Uses repository for data access.
 */

import {
  findVariationWithDiscounts,
  findInventory,
  findPromoByCodeWithProducts,
  findLocationById,
  findMemberById,
  findContactForSale,
  findPromoByCode,
  incrementPromoUsage,
  createSaleWithItemsAndDeductInventory,
  updateMemberAggregation,
  createAuditLog,
  findUserLastLogin,
  findSaleById,
  findSaleWithPaymentsOnly,
  createSalePayment,
  findShowroomLocations,
  findSalesPaginatedByFilter,
  countSalesByFilter,
  findSalesPaginatedForUserSince,
  countSalesForUserSince,
  aggregateSalesByFilter,
  aggregateSalesByTypeByFilter,
  findSalesForExportByFilter,
  findSalesForDailyChartByFilter,
  updateSaleContactId,
  softDeleteSale,
  createSaleRevision,
} from "./sale.repository";
import contactRepository from "@/modules/contacts/contact.repository";
import memberRepository from "@/modules/members/member.repository";
import tenantSettingsService from "@/modules/tenant-settings/tenant-settings.service";
import pipelineRepository from "@/modules/pipelines/pipeline.repository";
import dealRepository from "@/modules/deals/deal.repository";
import { executeWorkflowRules } from "@/modules/workflows/workflow.engine";
import automationService from "@/modules/automation/automation.service";

// ── Shared types ──────────────────────────────────────────────────────────

export interface SaleItemInput {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  discountId?: string | null;
  promoCode?: string;
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  discountReason?: string;
}

export interface ProcessedItem {
  variationId: string;
  subVariationId: string | null;
  quantity: number;
  unitPrice: number;
  totalMrp: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  promoDiscount: number;
  manualDiscountPercent?: number | null;
  manualDiscountAmount?: number | null;
  discountReason?: string | null;
  discountApprovedById?: string | null;
}

export interface CalculationResult {
  processedItems: ProcessedItem[];
  subtotal: number;
  /** Total monetary discount from product catalog + manual lines (excludes promo-only portion). */
  totalProductDiscount: number;
  /** Total monetary discount after promos (same as sum of line effective discounts). */
  totalDiscount: number;
  /** Sum of promo-applied discount amounts only (incremental or replacing catalog). */
  totalPromoDiscount: number;
  /** True if any line had a promo that replaced/won over product discount (not stacking). */
  promoOverrodeProductDiscount: boolean;
  total: number;
}

export class SaleCalculationError extends Error {
  status: number;
  extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ── Core calculation ──────────────────────────────────────────────────────

const MANUAL_DISCOUNT_AUTH_THRESHOLD_PERCENT = 20;
const AUTHORIZED_ROLES = ["admin", "superAdmin", "platformAdmin"];

/**
 * Validates items, resolves discounts & promo codes, and computes totals.
 *
 * Pure calculation — no DB writes (stock decrement, promo usage, sale
 * creation) happen here. The caller decides what to persist.
 *
 * Throws `SaleCalculationError` on validation failures (bad item, missing
 * stock, unknown variation, etc.).
 *
 * When manual discount is used, opts.userId and opts.userRole must be
 * provided for create/edit. For preview, opts may be omitted.
 */
export async function calculateSaleItems(
  items: SaleItemInput[],
  locationId: string,
  saleType: "GENERAL" | "MEMBER",
  tenantId: string,
  opts?: { userId: string; userRole: string },
): Promise<CalculationResult> {
  const processedItems: ProcessedItem[] = [];
  let subtotal = 0;
  let totalProductDiscount = 0;
  let totalDiscount = 0;
  let totalPromoDiscount = 0;
  let promoOverrodeProductDiscount = false;

  for (const item of items) {
    if (!item.variationId || !item.quantity || item.quantity <= 0) {
      throw new SaleCalculationError(
        400,
        "Each item must have a variationId and positive quantity",
      );
    }

    const variation = await findVariationWithDiscounts(item.variationId);

    if (!variation) {
      throw new SaleCalculationError(
        404,
        `Product variation ${item.variationId} not found`,
      );
    }

    // ── Sub-variation validation ──────────────────────────────────────

    const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
    const subVariationId = item.subVariationId ?? null;

    if (hasSubVariants && !subVariationId) {
      throw new SaleCalculationError(
        400,
        `Product ${variation.product.name} has sub-variants; please specify subVariationId`,
      );
    }
    if (!hasSubVariants && subVariationId) {
      throw new SaleCalculationError(
        400,
        `Product ${variation.product.name} has no sub-variants; do not send subVariationId`,
      );
    }
    if (subVariationId) {
      const belongs = variation.subVariations?.some(
        (s) => s.id === subVariationId,
      );
      if (!belongs) {
        throw new SaleCalculationError(
          400,
          `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
        );
      }
    }

    // ── Stock check ──────────────────────────────────────────────────

    const inventory = await findInventory(
      locationId,
      item.variationId,
      subVariationId,
    );

    const availableStock = inventory?.quantity || 0;
    if (availableStock < item.quantity) {
      throw new SaleCalculationError(
        400,
        `Insufficient stock for ${variation.product.name} (${variation.product.imsCode}${subVariationId ? " / sub-variant" : ""})`,
        { available: availableStock, requested: item.quantity },
      );
    }

    // ── Price & discount resolution ──────────────────────────────────

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    let discountPercent = 0;
    let discountAmount = 0;
    let manualDiscountPercent: number | null = null;
    let manualDiscountAmount: number | null = null;
    let discountReason: string | null = null;
    let discountApprovedById: string | null = null;

    // ── Manual discount (enterprise) — overrides product discount when set ──
    const hasManualPercent =
      item.manualDiscountPercent != null && item.manualDiscountPercent > 0;
    const hasManualAmount =
      item.manualDiscountAmount != null && item.manualDiscountAmount > 0;
    if (hasManualPercent || hasManualAmount) {
      if (
        !item.discountReason ||
        typeof item.discountReason !== "string" ||
        item.discountReason.trim().length === 0
      ) {
        throw new SaleCalculationError(
          400,
          "Discount reason is required when applying manual discount",
        );
      }
      discountReason = item.discountReason.trim();

      let manualEffectivePercent = 0;
      if (hasManualAmount) {
        const amt = Math.min(item.manualDiscountAmount!, itemSubtotal);
        discountAmount = amt;
        manualDiscountAmount = amt;
        manualEffectivePercent =
          itemSubtotal > 0 ? (amt / itemSubtotal) * 100 : 0;
      } else {
        discountPercent = Math.min(item.manualDiscountPercent!, 100);
        manualDiscountPercent = discountPercent;
        manualEffectivePercent = discountPercent;
      }

      // Authorization threshold: manual discount > 20% requires admin/superadmin/platformAdmin
      if (
        manualEffectivePercent > MANUAL_DISCOUNT_AUTH_THRESHOLD_PERCENT &&
        opts
      ) {
        if (!AUTHORIZED_ROLES.includes(opts.userRole)) {
          throw new SaleCalculationError(
            403,
            `Manual discount above ${MANUAL_DISCOUNT_AUTH_THRESHOLD_PERCENT}% requires admin approval`,
          );
        }
      }
      if (opts?.userId) {
        discountApprovedById = opts.userId;
      }
      // Manual discount: skip product discount and promo for this line
    }

    type PromoOutcome = "none" | "stack" | "replace";
    let promoOutcome: PromoOutcome = "none";
    let productDiscountMoneyBeforePromo = 0;

    if (!hasManualPercent && !hasManualAmount) {
      type DiscountRow = (typeof variation.product.discounts)[number] & {
        discountType: { name: string };
      };
      const activeDiscounts = variation.product.discounts as DiscountRow[];
      let baseDiscount: DiscountRow | null = null;

      if (item.discountId && item.discountId !== "none") {
        baseDiscount =
          activeDiscounts?.find((d) => d.id === item.discountId) ?? null;
      } else if (!item.discountId) {
        if (activeDiscounts && activeDiscounts.length > 0) {
          const eligible = activeDiscounts.filter((d) => {
            const tn = d.discountType.name.toLowerCase();
            if (saleType === "MEMBER") {
              return tn.includes("member") || tn.includes("non-member");
            }
            return tn.includes("non-member") || tn.includes("wholesale");
          });
          if (eligible.length > 0) {
            eligible.sort((a, b) => {
              const aS =
                a.discountType.name.toLowerCase() === "special" ? 1 : 0;
              const bS =
                b.discountType.name.toLowerCase() === "special" ? 1 : 0;
              if (aS !== bS) return bS - aS;
              const aV =
                a.valueType === "FLAT"
                  ? Number(a.value)
                  : (Number(a.value) / 100) * itemSubtotal;
              const bV =
                b.valueType === "FLAT"
                  ? Number(b.value)
                  : (Number(b.value) / 100) * itemSubtotal;
              return bV - aV;
            });
            baseDiscount = eligible[0];
          }
        }
      }

      if (baseDiscount) {
        const val =
          Number(baseDiscount.value) || Number(baseDiscount.discountPercentage);
        if (baseDiscount.valueType === "FLAT") {
          discountAmount += val;
        } else {
          discountPercent += val;
        }
      }

      productDiscountMoneyBeforePromo = Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      );

      // ── Promo code (only when not using manual discount) ────────────────

      if (item.promoCode) {
        const promo = await findPromoByCodeWithProducts(
          tenantId,
          item.promoCode,
        );

        if (promo && promo.isActive) {
          const now = new Date();
          const withinDates =
            (!promo.validFrom || promo.validFrom <= now) &&
            (!promo.validTo || promo.validTo >= now) &&
            (!promo.usageLimit || promo.usageCount < promo.usageLimit);

          if (withinDates) {
            const isProductEligible =
              promo.products.length === 0 ||
              promo.products.some((pp) => pp.productId === variation.productId);

            let isCustomerEligible = false;
            if (promo.eligibility === "ALL") isCustomerEligible = true;
            else if (promo.eligibility === "MEMBER")
              isCustomerEligible = saleType === "MEMBER";
            else if (promo.eligibility === "NON_MEMBER")
              isCustomerEligible = saleType === "GENERAL";

            if (isProductEligible && isCustomerEligible) {
              const baseAfterProductDiscount =
                itemSubtotal -
                (discountAmount + itemSubtotal * (discountPercent / 100));

              let promoAmt = 0;
              if (promo.valueType === "FLAT") {
                promoAmt = Number(promo.value);
              } else {
                promoAmt =
                  baseAfterProductDiscount * (Number(promo.value) / 100);
              }

              if (promo.overrideDiscounts) {
                discountAmount = promoAmt;
                discountPercent = 0;
                promoOutcome = "replace";
              } else if (promo.allowStacking) {
                discountAmount += promoAmt;
                promoOutcome = "stack";
              } else {
                const baseTotalDiscount =
                  discountAmount + itemSubtotal * (discountPercent / 100);
                if (promoAmt > baseTotalDiscount) {
                  discountAmount = promoAmt;
                  discountPercent = 0;
                  promoOutcome = "replace";
                }
              }
            }
          }
        }
      }

      // For non-manual path, we need to set effective discount for clamp below
      // (already set above via discountPercent/discountAmount)
    }

    // ── Clamp & accumulate ───────────────────────────────────────────

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    const lineTotal = itemSubtotal - effectiveDiscount;

    let itemProductDiscount = 0;
    let itemPromoDiscount = 0;
    if (hasManualPercent || hasManualAmount) {
      itemProductDiscount = effectiveDiscount;
    } else if (promoOutcome === "stack") {
      itemProductDiscount = Math.min(
        productDiscountMoneyBeforePromo,
        effectiveDiscount,
      );
      itemPromoDiscount = Math.max(
        0,
        Math.round((effectiveDiscount - itemProductDiscount) * 100) / 100,
      );
    } else if (promoOutcome === "replace") {
      itemProductDiscount = 0;
      itemPromoDiscount = effectiveDiscount;
      promoOverrodeProductDiscount = true;
    } else {
      itemProductDiscount = effectiveDiscount;
    }

    subtotal += itemSubtotal;
    totalProductDiscount += itemProductDiscount;
    totalDiscount += effectiveDiscount;
    totalPromoDiscount += itemPromoDiscount;

    processedItems.push({
      variationId: item.variationId,
      subVariationId: subVariationId ?? null,
      quantity: item.quantity,
      unitPrice,
      totalMrp: itemSubtotal,
      discountPercent,
      discountAmount: effectiveDiscount,
      lineTotal,
      promoDiscount: itemPromoDiscount,
      manualDiscountPercent: manualDiscountPercent ?? undefined,
      manualDiscountAmount: manualDiscountAmount ?? undefined,
      discountReason: discountReason ?? undefined,
      discountApprovedById: discountApprovedById ?? undefined,
    });
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;

  return {
    processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalProductDiscount: Math.round(totalProductDiscount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPromoDiscount: Math.round(totalPromoDiscount * 100) / 100,
    promoOverrodeProductDiscount,
    total,
  };
}

// ── SaleService class (orchestration for controller) ───────────────────────

function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

/** Derive sale code for an edit: base code (strip -E{n}) + -E{parent.revisionNo}. */
function saleCodeForRevision(
  parentSaleCode: string,
  parentRevisionNo: number,
): string {
  const base = parentSaleCode.replace(/-E\d+$/i, "");
  return `${base}-E${parentRevisionNo}`;
}

export interface CreateSaleContext {
  tenantId: string;
  userId: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
}

export interface GetAllSalesParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  locationId?: string;
  createdById?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
  userRole?: string;
  userId?: string;
}

interface SalePaymentInput {
  method: string;
  amount: number;
}

async function validatePaymentMethods(
  tenantId: string,
  payments?: SalePaymentInput[],
): Promise<void> {
  if (!payments?.length) return;
  for (const payment of payments) {
    await tenantSettingsService.assertMethodAllowed(
      tenantId,
      payment.method.trim().toUpperCase(),
    );
  }
}

function normalizePayments(
  payments?: SalePaymentInput[],
): SalePaymentInput[] | undefined {
  if (!payments) return undefined;
  return payments.map((payment) => ({
    ...payment,
    method: payment.method.trim().toUpperCase(),
  }));
}

async function runPurchaseFollowUpWorkflow(input: {
  tenantId: string;
  userId: string;
  contactId: string;
  memberId?: string | null;
}): Promise<void> {
  const remarketingPipeline = await pipelineRepository.findByType(
    input.tenantId,
    "REMARKETING",
  );
  if (!remarketingPipeline) return;

  const stage =
    Array.isArray(remarketingPipeline.stages) &&
    remarketingPipeline.stages.length > 0
      ? (remarketingPipeline.stages[0] as {
          name: string;
          probability?: number;
        })
      : null;
  if (!stage?.name) return;

  let workflowDealId =
    (
      await dealRepository.findLatestOpenDealForContactInPipeline(
        input.tenantId,
        input.contactId,
        remarketingPipeline.id,
      )
    )?.id ?? null;

  if (!workflowDealId) {
    const createdDeal = await dealRepository.create(
      input.tenantId,
      {
        name: "Remarketing follow-up",
        value: 0,
        stage: stage.name,
        contactId: input.contactId,
        memberId: input.memberId ?? undefined,
        pipelineId: remarketingPipeline.id,
        assignedToId: input.userId,
      },
      input.userId,
      stage.name,
      remarketingPipeline.id,
    );
    workflowDealId = createdDeal.id;
  }

  const workflowDeal = await dealRepository.findById(
    input.tenantId,
    workflowDealId,
  );
  if (!workflowDeal) return;

  await executeWorkflowRules({
    trigger: "PURCHASE_COUNT_CHANGED",
    deal: {
      id: workflowDeal.id,
      tenantId: workflowDeal.tenantId,
      pipelineId: workflowDeal.pipelineId,
      stage: workflowDeal.stage,
      status: workflowDeal.status,
      contactId: workflowDeal.contactId,
      memberId: workflowDeal.memberId,
      companyId: workflowDeal.companyId,
      assignedToId: workflowDeal.assignedToId ?? input.userId,
      createdById: workflowDeal.createdById,
    },
    userId: input.userId,
  });
}

export async function createSale(
  ctx: CreateSaleContext,
  dto: {
    locationId: string;
    memberPhone?: string;
    memberName?: string;
    contactId?: string | null;
    isCreditSale?: boolean;
    items: SaleItemInput[];
    notes?: string;
    payments?: SalePaymentInput[];
  },
) {
  const location = await findLocationById(dto.locationId);
  if (!location) {
    throw Object.assign(new Error("Location not found"), { statusCode: 404 });
  }
  if (!location.isActive) {
    throw Object.assign(new Error("Location is inactive"), { statusCode: 400 });
  }
  if (location.type !== "SHOWROOM") {
    throw Object.assign(
      new Error("Sales can only be made at showrooms, not warehouses"),
      { statusCode: 400 },
    );
  }

  let member: Awaited<
    ReturnType<typeof memberRepository.findOrCreateByPhone>
  > | null = null;
  let saleType: "GENERAL" | "MEMBER" = "GENERAL";
  let resolvedContactId: string | null = null;

  if (dto.contactId) {
    const contact = await findContactForSale(ctx.tenantId, dto.contactId);
    if (!contact) {
      throw Object.assign(new Error("Contact not found"), { statusCode: 404 });
    }
    resolvedContactId = contact.id;
    if (contact.memberId || contact.member) {
      const existingMember = contact.member;
      if (existingMember) {
        member = await findMemberById(existingMember.id);
        if (member?.isActive) saleType = "MEMBER";
      }
    } else if (contact.phone) {
      const { parseAndValidatePhone } = await import("@/utils/phone");
      const parsed = parseAndValidatePhone(contact.phone);
      if (parsed.valid) {
        const name = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        member = await memberRepository.findOrCreateByPhone(
          ctx.tenantId,
          (parsed as { e164: string }).e164,
          name || null,
        );
        if (member.isActive) saleType = "MEMBER";
      }
    }
  }

  if (dto.memberPhone && !member) {
    const { parseAndValidatePhone } = await import("@/utils/phone");
    const parsed = parseAndValidatePhone(dto.memberPhone);
    if (!parsed.valid) {
      const err = parsed as { valid: false; message: string };
      throw Object.assign(new Error(err.message), { statusCode: 400 });
    }
    member = await memberRepository.findOrCreateByPhone(
      ctx.tenantId,
      parsed.e164,
      dto.memberName?.trim() || null,
    );
    if (member.isActive) saleType = "MEMBER";
  }

  if (dto.isCreditSale === true && !member && !resolvedContactId) {
    throw Object.assign(
      new Error(
        "Credit sales require a customer. Select a contact or enter the customer's phone number.",
      ),
      { statusCode: 400 },
    );
  }

  const { processedItems, subtotal, totalDiscount, totalPromoDiscount, total } =
    await calculateSaleItems(
      dto.items,
      dto.locationId,
      saleType,
      ctx.tenantId,
      {
        userId: ctx.userId,
        userRole: ctx.userRole ?? "user",
      },
    );

  const promoCodesUsed = new Set<string>();
  for (const item of dto.items) {
    const code = item.promoCode?.trim();
    if (!code || promoCodesUsed.has(code)) continue;
    promoCodesUsed.add(code);
    const promo = await findPromoByCode(ctx.tenantId, code);
    if (promo) {
      await incrementPromoUsage(promo.id);
    }
  }

  const normalizedPayments = normalizePayments(dto.payments);
  await validatePaymentMethods(ctx.tenantId, normalizedPayments);
  const creditSale = dto.isCreditSale === true;

  if (!creditSale && normalizedPayments && normalizedPayments.length > 0) {
    const paymentSum =
      Math.round(
        normalizedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) *
          100,
      ) / 100;
    if (Math.abs(paymentSum - total) > 0.01) {
      throw Object.assign(
        new Error(
          "Sum of payment sources must match final total (after discounts)",
        ),
        { statusCode: 400, extra: { total, paymentSum } },
      );
    }
  }

  const sale = await createSaleWithItemsAndDeductInventory({
    tenantId: ctx.tenantId,
    saleCode: generateSaleCode(),
    type: saleType,
    isCreditSale: creditSale,
    locationId: dto.locationId,
    memberId: member?.id ?? null,
    contactId: resolvedContactId,
    createdById: ctx.userId,
    subtotal,
    discount: totalDiscount,
    promoDiscount: promoCodesUsed.size > 0 ? totalPromoDiscount : undefined,
    total,
    notes: dto.notes ?? null,
    promoCodesUsed:
      promoCodesUsed.size > 0 ? Array.from(promoCodesUsed) : undefined,
    items: processedItems.map((item) => ({
      variationId: item.variationId,
      subVariationId: item.subVariationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalMrp: item.totalMrp,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
      manualDiscountPercent: item.manualDiscountPercent,
      manualDiscountAmount: item.manualDiscountAmount,
      discountReason: item.discountReason,
      discountApprovedById: item.discountApprovedById,
    })),
    payments: normalizedPayments,
  });

  if (member) {
    try {
      await updateMemberAggregation(member.id, {
        totalIncrement: total,
        memberSince: member.createdAt ?? new Date(),
        firstPurchase: member.firstPurchase ?? new Date(),
      });
    } catch {
      // Log but don't fail sale creation
    }
  }

  // Auto-create CRM contact when sale has customer info but no linked contact
  let finalSale = sale;
  if (!resolvedContactId && member) {
    try {
      const newContact = await contactRepository.findOrCreateFromMember(
        ctx.tenantId,
        { id: member.id, phone: member.phone, name: member.name },
        ctx.userId,
      );
      await updateSaleContactId(sale.id, newContact.id);
      finalSale = { ...sale, contactId: newContact.id };
      resolvedContactId = newContact.id;
    } catch {
      // Log but don't fail sale creation
    }
  } else if (!resolvedContactId && !member && dto.memberPhone) {
    try {
      const newContact = await contactRepository.findOrCreateFromSaleInfo(
        ctx.tenantId,
        {
          phone: dto.memberPhone,
          name: dto.memberName ?? null,
        },
        ctx.userId,
      );
      await updateSaleContactId(sale.id, newContact.id);
      finalSale = { ...sale, contactId: newContact.id };
      resolvedContactId = newContact.id;
    } catch {
      // Log but don't fail sale creation
    }
  }

  // Increment purchaseCount on the linked contact and apply loyalty tier
  if (resolvedContactId) {
    try {
      await contactRepository.incrementPurchaseCount(resolvedContactId);
      const { applyLoyaltyTier } =
        await import("@/modules/contacts/loyalty.service");
      await applyLoyaltyTier(resolvedContactId);
      await runPurchaseFollowUpWorkflow({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        contactId: resolvedContactId,
        memberId: member?.id ?? null,
      });
    } catch {
      // Log but don't fail sale creation
    }
  }

  try {
    await createAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "CREATE_SALE",
      resource: "sale",
      resourceId: sale.id,
      details: {
        saleCode: sale.saleCode,
        total: Number(sale.total),
        locationId: sale.locationId,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  } catch {
    // Log but don't fail
  }

  await Promise.all(
    processedItems.map((item) =>
      automationService.syncLowStockSignal({
        tenantId: ctx.tenantId,
        locationId: dto.locationId,
        variationId: item.variationId,
        subVariationId: item.subVariationId,
        actorUserId: ctx.userId,
        reason: "sale_created",
      }),
    ),
  ).catch(() => {
    // Do not fail sale creation when automation side effects fail.
  });

  await automationService
    .publishDomainEvent({
      tenantId: ctx.tenantId,
      eventName: "sales.sale.created",
      scopeType: "LOCATION",
      scopeId: finalSale.locationId,
      entityType: "SALE",
      entityId: finalSale.id,
      actorUserId: ctx.userId,
      dedupeKey: `sale-created:${finalSale.id}`,
      payload: {
        saleId: finalSale.id,
        saleCode: finalSale.saleCode,
        locationId: finalSale.locationId,
        memberId: finalSale.memberId,
        contactId: finalSale.contactId,
        total: Number(finalSale.total),
        subtotal: Number(finalSale.subtotal),
        itemCount: finalSale.items.length,
      },
    })
    .catch(() => {
      // Do not fail sale creation when automation event publishing fails.
    });

  return finalSale;
}

export async function deleteSale(
  saleId: string,
  userId: string,
  deleteReason?: string | null,
) {
  const sale = await findSaleById(saleId);
  const result = await softDeleteSale(saleId, userId, deleteReason ?? null);
  if (!result) {
    throw Object.assign(new Error("Sale not found or already deleted"), {
      statusCode: 404,
    });
  }

  if (sale) {
    await Promise.allSettled(
      sale.items.map((item) =>
        automationService.syncLowStockSignal({
          tenantId: sale.tenantId,
          locationId: sale.locationId,
          variationId: item.variationId,
          subVariationId: item.subVariationId,
          actorUserId: userId,
          reason: "sale_deleted",
        }),
      ),
    );
  }

  return result;
}

export async function editSale(
  saleId: string,
  userId: string,
  dto: {
    items: SaleItemInput[];
    notes?: string;
    payments?: SalePaymentInput[];
    editReason?: string | null;
  },
  userRole?: string,
) {
  const sale = await findSaleById(saleId);
  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }
  if (sale.deletedAt) {
    throw Object.assign(new Error("Cannot edit a deleted sale"), {
      statusCode: 400,
    });
  }
  if (!sale.isLatest) {
    throw Object.assign(new Error("Cannot edit a superseded revision"), {
      statusCode: 400,
    });
  }

  const location = await findLocationById(sale.locationId);
  if (!location?.isActive || location.type !== "SHOWROOM") {
    throw Object.assign(new Error("Sale location is invalid or inactive"), {
      statusCode: 400,
    });
  }

  const { processedItems, subtotal, totalDiscount, totalPromoDiscount, total } =
    await calculateSaleItems(
      dto.items,
      sale.locationId,
      sale.type as "GENERAL" | "MEMBER",
      sale.tenantId,
      { userId, userRole: userRole ?? "user" },
    );

  const promoCodesUsed = new Set<string>();
  for (const item of dto.items) {
    const code = item.promoCode?.trim();
    if (!code || promoCodesUsed.has(code)) continue;
    promoCodesUsed.add(code);
  }
  const normalizedPayments = normalizePayments(dto.payments);
  await validatePaymentMethods(sale.tenantId, normalizedPayments);
  const creditSale = sale.isCreditSale;
  if (!creditSale && normalizedPayments && normalizedPayments.length > 0) {
    const paymentSum =
      Math.round(
        normalizedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) *
          100,
      ) / 100;
    const totalNum = Number(total);
    if (Math.abs(paymentSum - totalNum) > 0.01) {
      throw Object.assign(
        new Error(
          `Payment total ${paymentSum} does not match sale total ${totalNum}`,
        ),
        { statusCode: 400 },
      );
    }
  }

  const revisionSaleCode = saleCodeForRevision(
    sale.saleCode,
    sale.revisionNo ?? 1,
  );

  const result = await createSaleRevision({
    tenantId: sale.tenantId,
    saleCode: revisionSaleCode,
    type: sale.type as "GENERAL" | "MEMBER",
    isCreditSale: creditSale,
    locationId: sale.locationId,
    memberId: sale.memberId,
    contactId: sale.contactId,
    createdById: sale.createdById,
    subtotal: Number(subtotal),
    discount: Number(totalDiscount),
    promoDiscount: Number(totalPromoDiscount),
    total: Number(total),
    notes: dto.notes ?? sale.notes ?? null,
    promoCodesUsed: Array.from(promoCodesUsed),
    items: processedItems.map((p) => ({
      variationId: p.variationId,
      subVariationId: p.subVariationId,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalMrp: p.totalMrp,
      discountPercent: p.discountPercent,
      discountAmount: p.discountAmount,
      lineTotal: p.lineTotal,
      manualDiscountPercent: p.manualDiscountPercent,
      manualDiscountAmount: p.manualDiscountAmount,
      discountReason: p.discountReason,
      discountApprovedById: p.discountApprovedById,
    })),
    payments: normalizedPayments,
    parentSaleId: saleId,
    editedById: userId,
    editReason: dto.editReason ?? null,
  });

  if (!result) {
    throw Object.assign(new Error("Failed to create sale revision"), {
      statusCode: 500,
    });
  }

  const inventoryKeys = new Map<
    string,
    { variationId: string; subVariationId: string | null }
  >();

  for (const item of sale.items) {
    const key = `${item.variationId}:${item.subVariationId ?? "base"}`;
    inventoryKeys.set(key, {
      variationId: item.variationId,
      subVariationId: item.subVariationId ?? null,
    });
  }

  for (const item of result.items) {
    const key = `${item.variationId}:${item.subVariationId ?? "base"}`;
    inventoryKeys.set(key, {
      variationId: item.variationId,
      subVariationId: item.subVariationId ?? null,
    });
  }

  await Promise.allSettled(
    Array.from(inventoryKeys.values()).map((item) =>
      automationService.syncLowStockSignal({
        tenantId: sale.tenantId,
        locationId: sale.locationId,
        variationId: item.variationId,
        subVariationId: item.subVariationId,
        actorUserId: userId,
        reason: "sale_edited",
      }),
    ),
  );

  return result;
}

export async function previewSale(
  ctx: { tenantId: string },
  dto: {
    locationId: string;
    memberPhone?: string;
    memberName?: string;
    contactId?: string | null;
    items: SaleItemInput[];
  },
) {
  const location = await findLocationById(dto.locationId);
  if (!location || !location.isActive || location.type !== "SHOWROOM") {
    throw Object.assign(new Error("Invalid or inactive showroom"), {
      statusCode: 400,
    });
  }

  let saleType: "GENERAL" | "MEMBER" = "GENERAL";
  if (dto.contactId) {
    const contact = await findContactForSale(ctx.tenantId, dto.contactId);
    if (contact?.member?.isActive) saleType = "MEMBER";
    else if (contact?.phone) {
      const { parseAndValidatePhone } = await import("@/utils/phone");
      const parsed = parseAndValidatePhone(contact.phone);
      if (parsed.valid) {
        const member = await memberRepository.findByPhone(
          ctx.tenantId,
          (parsed as { e164: string }).e164,
        );
        if (member?.isActive) saleType = "MEMBER";
      }
    }
  }
  if (dto.memberPhone && saleType !== "MEMBER") {
    const { parseAndValidatePhone } = await import("@/utils/phone");
    const parsed = parseAndValidatePhone(dto.memberPhone);
    if (!parsed.valid) {
      const err = parsed as { valid: false; message: string };
      throw Object.assign(new Error(err.message), { statusCode: 400 });
    }
    const member = await memberRepository.findByPhone(
      ctx.tenantId,
      (parsed as { e164: string }).e164,
    );
    if (member?.isActive) saleType = "MEMBER";
  }

  return calculateSaleItems(dto.items, dto.locationId, saleType, ctx.tenantId);
}

export async function getAllSales(params: GetAllSalesParams) {
  let startDate = params.startDate;
  let endDate = params.endDate;

  // Business rule: "user" role restricted to today and yesterday
  if (params.userRole === "user") {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    if (!startDate && !endDate) {
      startDate = todayStart.toISOString().slice(0, 10);
      endDate = today.toISOString().slice(0, 10);
    } else {
      const reqStart = startDate ? new Date(startDate) : yesterdayStart;
      const reqEnd = endDate ? new Date(endDate) : today;
      if (reqStart < yesterdayStart)
        startDate = yesterdayStart.toISOString().slice(0, 10);
      if (reqEnd > today) endDate = today.toISOString().slice(0, 10);
    }
  }

  const filter = {
    locationId: params.locationId,
    createdById:
      params.userRole === "user" && params.userId
        ? params.userId
        : params.createdById,
    type: params.type,
    isCreditSale: params.isCreditSale,
    startDate,
    endDate,
    search: params.search,
  };

  const pagination = {
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  const [totalItems, sales] = await Promise.all([
    countSalesByFilter(filter),
    findSalesPaginatedByFilter(filter, pagination),
  ]);

  return { sales, totalItems, page: params.page, limit: params.limit };
}

export async function getSalesSinceLastLogin(
  userId: string,
  params: { page: number; limit: number },
) {
  const user = await findUserLastLogin(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  const since = user.lastLoginAt ?? new Date(0);

  const [totalItems, sales] = await Promise.all([
    countSalesForUserSince(userId, since),
    findSalesPaginatedForUserSince(userId, since, params),
  ]);

  return { sales, totalItems, page: params.page, limit: params.limit };
}

export interface GetMySalesParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  locationId?: string;
  type?: "GENERAL" | "MEMBER";
  isCreditSale?: boolean;
}

export async function getMySales(userId: string, params: GetMySalesParams) {
  const filter = {
    createdById: userId,
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId,
    type: params.type,
    isCreditSale: params.isCreditSale,
  };

  const pagination = {
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  const [totalItems, sales] = await Promise.all([
    countSalesByFilter(filter),
    findSalesPaginatedByFilter(filter, pagination),
  ]);

  return { sales, totalItems, page: params.page, limit: params.limit };
}

export async function getSaleById(id: string) {
  const sale = await findSaleById(id);
  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }
  return sale;
}

export async function addPayment(
  saleId: string,
  dto: { method: string; amount: number },
) {
  const sale = await findSaleWithPaymentsOnly(saleId);
  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }
  if (!sale.isCreditSale) {
    throw Object.assign(
      new Error("Payments can only be added to credit sales"),
      { statusCode: 400 },
    );
  }

  const amountPaid =
    sale.payments.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalNum = Number(sale.total);
  const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;

  if (dto.amount > balanceDue + 0.01) {
    throw Object.assign(new Error("Payment amount exceeds balance due"), {
      statusCode: 400,
      extra: { balanceDue },
    });
  }

  await tenantSettingsService.assertMethodAllowed(
    sale.tenantId,
    dto.method.trim().toUpperCase(),
  );

  const payment = await createSalePayment({
    saleId,
    method: dto.method.trim().toUpperCase(),
    amount: dto.amount,
  });

  const updatedSale = await findSaleById(saleId);
  return { sale: updatedSale!, payment };
}

export async function getSalesSummary(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const filter = {
    locationId: params.locationId,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const [totalStats, generalStats, memberStats] = await Promise.all([
    aggregateSalesByFilter(filter),
    aggregateSalesByTypeByFilter(filter, "GENERAL"),
    aggregateSalesByTypeByFilter(filter, "MEMBER"),
  ]);

  return {
    totalSales: totalStats._count,
    totalRevenue: Number(totalStats._sum.total) || 0,
    totalDiscount: Number(totalStats._sum.discount) || 0,
    generalSales: {
      count: generalStats._count,
      revenue: Number(generalStats._sum.total) || 0,
    },
    memberSales: {
      count: memberStats._count,
      revenue: Number(memberStats._sum.total) || 0,
    },
  };
}

export async function getSalesByLocation(params: {
  startDate?: string;
  endDate?: string;
}) {
  const filter = {
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const locations = await findShowroomLocations();

  const locationStats = await Promise.all(
    locations.map(async (location) => {
      const stats = await aggregateSalesByFilter({
        ...filter,
        locationId: location.id,
      });
      return {
        locationId: location.id,
        locationName: location.name,
        totalSales: stats._count,
        totalRevenue: Number(stats._sum.total) || 0,
      };
    }),
  );

  return locationStats;
}

export async function getDailySales(params: {
  locationId?: string;
  days?: number;
}) {
  const days = params.days ?? 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sales = await findSalesForDailyChartByFilter({
    locationId: params.locationId,
    startDate,
    endDate,
  });

  const dailyData: Record<
    string,
    {
      date: string;
      total: number;
      count: number;
      general: number;
      member: number;
    }
  > = {};

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    dailyData[dateStr] = {
      date: dateStr,
      total: 0,
      count: 0,
      general: 0,
      member: 0,
    };
  }

  for (const sale of sales) {
    const dateStr = sale.createdAt.toISOString().slice(0, 10);
    if (dailyData[dateStr]) {
      dailyData[dateStr].total += Number(sale.total);
      dailyData[dateStr].count += 1;
      if (sale.type === "GENERAL") {
        dailyData[dateStr].general += Number(sale.total);
      } else {
        dailyData[dateStr].member += Number(sale.total);
      }
    }
  }

  return Object.values(dailyData);
}

export async function getSalesForExport(params: { ids?: string[] }) {
  const sales = await findSalesForExportByFilter({ ids: params.ids });
  if (sales.length === 0) {
    throw Object.assign(new Error("No sales found to export"), {
      statusCode: 404,
    });
  }
  return sales;
}

/** SaleService — business logic, uses repository. Export instance for controller injection. */
export class SaleService {
  async createSale(
    ctx: CreateSaleContext,
    dto: {
      locationId: string;
      memberPhone?: string;
      memberName?: string;
      contactId?: string | null;
      isCreditSale?: boolean;
      items: SaleItemInput[];
      notes?: string;
      payments?: SalePaymentInput[];
    },
  ) {
    return createSale(ctx, dto);
  }

  async previewSale(
    ctx: { tenantId: string },
    dto: {
      locationId: string;
      memberPhone?: string;
      memberName?: string;
      contactId?: string | null;
      items: SaleItemInput[];
    },
  ) {
    return previewSale(ctx, dto);
  }

  async getAllSales(params: GetAllSalesParams) {
    return getAllSales(params);
  }

  async getMySales(userId: string, params: GetMySalesParams) {
    return getMySales(userId, params);
  }

  async getSalesSinceLastLogin(
    userId: string,
    params: { page: number; limit: number },
  ) {
    return getSalesSinceLastLogin(userId, params);
  }

  async getSaleById(id: string) {
    return getSaleById(id);
  }

  async addPayment(saleId: string, dto: { method: string; amount: number }) {
    return addPayment(saleId, dto);
  }

  async deleteSale(saleId: string, userId: string, deleteReason?: string) {
    return deleteSale(saleId, userId, deleteReason);
  }

  async editSale(
    saleId: string,
    userId: string,
    dto: {
      items: SaleItemInput[];
      notes?: string;
      payments?: SalePaymentInput[];
      editReason?: string | null;
    },
    userRole?: string,
  ) {
    return editSale(saleId, userId, dto, userRole);
  }

  async getSalesSummary(params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return getSalesSummary(params);
  }

  async getSalesByLocation(params: { startDate?: string; endDate?: string }) {
    return getSalesByLocation(params);
  }

  async getDailySales(params: { locationId?: string; days?: number }) {
    return getDailySales(params);
  }

  async getSalesForExport(params: { ids?: string[] }) {
    return getSalesForExport(params);
  }
}

const saleService = new SaleService();
export default saleService;
