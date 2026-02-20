/**
 * Prisma Client — Singleton with tenant auto-scoping.
 *
 * Uses Prisma client extensions to automatically inject tenantId
 * into queries when a tenant context is active (set by middleware).
 *
 * Models WITHOUT tenantId (child models accessed via relations):
 *   SubCategory, ProductVariation, ProductSubVariation, VariationPhoto,
 *   ProductDiscount, TransferItem, TransferLog, SaleItem, SalePayment,
 *   PromoCodeProduct, LocationInventory
 *
 * Models WITH tenantId (auto-scoped):
 *   User, Category, Product, DiscountType, Vendor, Location, Transfer,
 *   Member, Sale, PromoCode, AuditLog, ErrorReport
 *
 * Platform-only models (never tenant-scoped):
 *   Tenant, PlanLimit, PricingPlan, Subscription, TenantPayment
 */

import { PrismaClient } from "@prisma/client";
import { getTenantId } from "./tenantContext";

const basePrisma = new PrismaClient();

/**
 * Models that have a tenantId column and should be auto-scoped.
 */
const TENANT_SCOPED_MODELS = new Set([
  "User",
  "Category",
  "Product",
  "DiscountType",
  "Vendor",
  "Location",
  "Transfer",
  "Member",
  "Sale",
  "PromoCode",
  "AuditLog",
  "ErrorReport",
]);

/**
 * Models that support soft delete (trash). Queries filter deletedAt: null by default.
 */
const TRASHABLE_MODELS = new Set([
  "Category",
  "SubCategory",
  "Product",
  "Vendor",
  "Member",
  "Location",
  "PromoCode",
  "Company",
  "Contact",
  "Lead",
  "Deal",
  "Task",
  "Activity",
  "Pipeline",
]);

/**
 * Check if a model name (PascalCase) is tenant-scoped.
 */
function isTenantScoped(model: string | undefined): boolean {
  if (!model) return false;
  return TENANT_SCOPED_MODELS.has(model);
}

/**
 * Check if a model supports soft delete.
 */
function isTrashable(model: string | undefined): boolean {
  if (!model) return false;
  return TRASHABLE_MODELS.has(model);
}

/**
 * Inject deletedAt: null for trashable models unless the query already specifies deletedAt.
 */
function maybeInjectDeletedAt(
  model: string | undefined,
  where: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!isTrashable(model) || !where) return where;
  if ("deletedAt" in where) return where; // Already filtering by deletedAt
  return { ...where, deletedAt: null };
}

/**
 * Extended Prisma client with automatic tenant scoping.
 *
 * When a tenant context is active (via AsyncLocalStorage), all queries
 * on tenant-scoped models automatically include the tenantId filter.
 * This is a safety net — controllers should still pass tenantId explicitly
 * where possible.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
      async findFirst({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
      async findUnique({ model, args, query }) {
        // findUnique uses unique fields, so we don't inject tenantId into where
        // (it would break compound unique lookups). Instead, we rely on the
        // unique constraint including tenantId in the schema.
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
      async create({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          // Only inject if tenantId is not already provided
          const data = args.data as Record<string, unknown>;
          if (!data.tenantId) {
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
        }
        return query(args);
      },
      async createMany({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          if (Array.isArray(args.data)) {
            args.data = (args.data as any[]).map((d: any) => ({
              ...d,
              tenantId: d.tenantId ?? tenantId,
            })) as any;
          } else {
            const data = args.data as Record<string, unknown>;
            if (!data.tenantId) {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
          }
        }
        return query(args);
      },
      async update({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId } as any;
        }
        return query(args);
      },
      async updateMany({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        return query(args);
      },
      async delete({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId } as any;
        }
        return query(args);
      },
      async deleteMany({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        return query(args);
      },
      async count({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
      async aggregate({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
      async groupBy({ model, args, query }) {
        const tenantId = getTenantId();
        if (tenantId && isTenantScoped(model)) {
          args.where = { ...args.where, tenantId };
        }
        args.where = (maybeInjectDeletedAt(model, args.where) ??
          args.where) as any;
        return query(args);
      },
    },
  },
});

export default prisma;

/**
 * Export the base (unscoped) client for cases that need it:
 * - Migrations and seeding
 * - Platform admin cross-tenant queries
 * - Health checks
 */
export { basePrisma };
