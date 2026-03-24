import { randomUUID } from "node:crypto";
import { parseDate } from "@repo/shared";
import { createError } from "@/middlewares/errorHandler";
import {
  getPaginationParams,
  getPrismaOrderBy,
  createPaginationResult,
} from "@/utils/pagination";
import type { Prisma } from "@prisma/client";
import productRepository, {
  type ProductRepository,
  type ProductCreateData,
  type ProductListWhere,
  type ProductStockSortFilters,
} from "./product.repository";
import {
  defaultImsCodeCandidates,
  isProductImsCodeTenantUniqueViolation,
} from "./ims-code";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateDiscountTypeDto,
  UpdateDiscountTypeDto,
  GetListQueryDto,
  GetProductDiscountsListQueryDto,
} from "./product.schema";

const LOW_STOCK_THRESHOLD = 5;
const ALLOWED_PRODUCT_SORT_FIELDS = [
  "dateCreated",
  "dateModified",
  "name",
  "costPrice",
  "mrp",
  "vendorId",
  "id",
  "imsCode",
];
const ALLOWED_DISCOUNT_SORT_FIELDS = [
  "id",
  "value",
  "valueType",
  "isActive",
  "startDate",
  "endDate",
  "createdAt",
];

export interface CreateProductContext {
  tenantId: string;
  userId: string;
  ip?: string;
  userAgent?: string;
}

export interface ProductListParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  locationId?: string;
  categoryId?: string;
  subCategoryId?: string;
  subCategory?: string;
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  lowStock?: boolean;
}

function isImsCodeConflict(err: unknown): boolean {
  return isProductImsCodeTenantUniqueViolation(err);
}

export class ProductService {
  constructor(private repo: ProductRepository) {}

  private mapPrismaConflict(err: unknown): never {
    if (isImsCodeConflict(err)) {
      throw createError("Product with this product code already exists", 409);
    }
    const e = err as { code?: string };
    if (e.code === "P2002") {
      throw createError("A duplicate value was provided.", 409);
    }
    throw err as Error;
  }

  async create(data: CreateProductDto, ctx: CreateProductContext) {
    const { tenantId, userId, ip, userAgent } = ctx;

    const category = await this.repo.findCategoryByIdAndTenant(
      tenantId,
      data.categoryId,
    );
    if (!category) {
      const err = createError("Category not found", 404) as Error & {
        providedCategoryId?: string;
      };
      err.providedCategoryId = data.categoryId;
      throw err;
    }

    if (data.vendorId) {
      const vendor = await this.repo.findVendorById(data.vendorId);
      if (!vendor) {
        const err = createError("Vendor not found", 404) as Error & {
          providedVendorId?: string;
        };
        err.providedVendorId = data.vendorId;
        throw err;
      }
    }

    const resolvedDiscounts: Prisma.ProductDiscountUncheckedCreateWithoutProductInput[] =
      [];
    if (data.discounts?.length) {
      for (const discount of data.discounts) {
        const discountType = await this.repo.findDiscountTypeByIdAndTenant(
          tenantId,
          discount.discountTypeId,
        );
        if (!discountType) {
          const err = createError("Discount type not found", 404) as Error & {
            providedDiscountTypeId?: string;
          };
          err.providedDiscountTypeId = discount.discountTypeId;
          throw err;
        }
        const pct = Number(discount.discountPercentage);
        resolvedDiscounts.push({
          discountTypeId: discountType.id,
          discountPercentage: pct,
          valueType: discount.valueType,
          value: discount.value ?? pct,
          startDate: parseDate(discount.startDate ?? "")?.toJSDate() ?? null,
          endDate: parseDate(discount.endDate ?? "")?.toJSDate() ?? null,
          isActive: discount.isActive,
        });
      }
    }

    let warehouseLocation: { id: string } | null = null;
    if (data.defaultLocationId) {
      const loc = await this.repo.findLocationByIdAndTenant(
        tenantId,
        data.defaultLocationId,
        { isActive: true },
      );
      if (!loc) {
        throw createError(
          "Product creation failed: the selected location is invalid or does not belong to your tenant",
          400,
        );
      }
      warehouseLocation = { id: loc.id };
    }
    if (!warehouseLocation) {
      const defaultWarehouse = await this.repo.findDefaultWarehouse(tenantId);
      if (!defaultWarehouse) {
        throw createError(
          "Product creation failed: tenant has no default warehouse configured. Please set a default warehouse in Locations.",
          400,
        );
      }
      warehouseLocation = defaultWarehouse;
    }

    const variationsCreate: Prisma.ProductVariationCreateWithoutProductInput[] =
      data.variations.map((v) => ({
        tenant: { connect: { id: tenantId } },
        stockQuantity: v.stockQuantity ?? 0,
        costPriceOverride:
          v.costPriceOverride != null ? Number(v.costPriceOverride) : null,
        mrpOverride: v.mrpOverride != null ? Number(v.mrpOverride) : null,
        finalSpOverride:
          v.finalSpOverride != null ? Number(v.finalSpOverride) : null,
        photos: v.photos?.length
          ? {
              create: v.photos.map((p) => ({
                photoUrl: p.photoUrl,
                isPrimary: p.isPrimary ?? false,
              })),
            }
          : undefined,
        subVariations: v.subVariants?.length
          ? {
              create: v.subVariants
                .map((n) =>
                  typeof n === "string"
                    ? n.trim()
                    : ((n as { name?: string })?.name?.trim() ?? ""),
                )
                .filter(Boolean)
                .map((name) => ({ name })),
            }
          : undefined,
        attributes: v.attributes?.length
          ? {
              create: v.attributes.map((a) => ({
                attributeType: { connect: { id: a.attributeTypeId } },
                attributeValue: { connect: { id: a.attributeValueId } },
              })),
            }
          : undefined,
      }));

    const trimmedIms =
      data.imsCode !== undefined &&
      data.imsCode !== null &&
      data.imsCode.trim() !== ""
        ? data.imsCode.trim()
        : undefined;
    const productId = randomUUID();

    const buildCreateData = (imsCode: string): ProductCreateData => ({
      tenantId,
      id: productId,
      imsCode,
      name: data.name,
      categoryId: category.id,
      description: data.description ?? null,
      subCategory: data.subCategory?.trim() || null,
      length: data.length ?? null,
      breadth: data.breadth ?? null,
      height: data.height ?? null,
      weight: data.weight ?? null,
      costPrice: Number(data.costPrice),
      mrp: Number(data.mrp),
      vendorId: data.vendorId ?? null,
      createdById: userId,
      variations: { create: variationsCreate },
      discounts:
        resolvedDiscounts.length > 0
          ? { create: resolvedDiscounts }
          : undefined,
    });

    let product:
      | Awaited<ReturnType<ProductRepository["createProduct"]>>
      | undefined;
    if (trimmedIms) {
      try {
        product = await this.repo.createProduct(buildCreateData(trimmedIms));
      } catch (err: unknown) {
        throw this.mapPrismaConflict(err);
      }
    } else {
      const tenantRow = await this.repo.findTenantName(tenantId);
      const tenantName = tenantRow?.name ?? "";
      const gen = defaultImsCodeCandidates(tenantName, productId);
      let lastErr: unknown;
      for (let attempt = 0; attempt < 40; attempt++) {
        const { value: candidate } = gen.next();
        if (candidate === undefined) break;
        try {
          product = await this.repo.createProduct(buildCreateData(candidate));
          lastErr = undefined;
          break;
        } catch (err: unknown) {
          lastErr = err;
          if (!isImsCodeConflict(err)) {
            throw this.mapPrismaConflict(err);
          }
        }
      }
      if (product === undefined) {
        throw this.mapPrismaConflict(
          lastErr ?? new Error("Unique product code"),
        );
      }
    }

    if (product === undefined) {
      throw createError("Product creation failed", 500);
    }

    if (data.attributeTypeIds?.length && Array.isArray(data.attributeTypeIds)) {
      const validTypeIds = await this.repo.findAttributeTypesByIdsAndTenant(
        tenantId,
        data.attributeTypeIds,
      );
      if (validTypeIds.length > 0) {
        await this.repo.createProductAttributeTypes(product.id, validTypeIds);
      }
    }

    if (warehouseLocation && product.variations?.length) {
      for (const v of product.variations) {
        const subVariations = Array.isArray(
          (v as { subVariations?: unknown[] }).subVariations,
        )
          ? (v as { subVariations: Array<{ id: string }> }).subVariations
          : [];
        const hasSubVariants = subVariations.length > 0;

        if (hasSubVariants) {
          for (const sub of subVariations) {
            const existing = await this.repo.findLocationInventory(
              warehouseLocation.id,
              v.id,
              sub.id,
            );
            if (!existing) {
              await this.repo.createLocationInventory({
                locationId: warehouseLocation.id,
                variationId: v.id,
                subVariationId: sub.id,
                quantity: 0,
              });
            }
          }
        } else {
          const qty = Math.max(
            0,
            Number((v as { stockQuantity?: number }).stockQuantity) || 0,
          );
          if (qty === 0) continue;
          const existing = await this.repo.findLocationInventory(
            warehouseLocation.id,
            v.id,
            null,
          );
          if (existing) {
            await this.repo.updateLocationInventoryQuantity(existing.id, qty);
          } else {
            await this.repo.createLocationInventory({
              locationId: warehouseLocation.id,
              variationId: v.id,
              subVariationId: null,
              quantity: qty,
            });
          }
        }
      }
    }

    try {
      await this.repo.createAuditLog({
        userId,
        action: "CREATE_PRODUCT",
        resource: "product",
        resourceId: product.id,
        details: {
          name: product.name,
          imsCode: product.imsCode,
        },
        ip,
        userAgent,
      });
    } catch {
      // Audit log failure is non-fatal
    }

    return product;
  }

  async findAll(tenantId: string, params: ProductListParams) {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      locationId,
      categoryId,
      subCategoryId,
      subCategory,
      vendorId,
      dateFrom,
      dateTo,
      lowStock,
    } = params;

    let lowStockVariationIds: string[] = [];
    if (lowStock) {
      lowStockVariationIds =
        await this.repo.getLowStockVariationIds(LOW_STOCK_THRESHOLD);
    }

    const skip = (page - 1) * limit;

    if (sortBy?.toLowerCase() === "totalstock") {
      const dateToEnd = dateTo
        ? (() => {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            return to;
          })()
        : undefined;
      const stockFilters: ProductStockSortFilters = {
        tenantId,
        search,
        categoryId,
        subCategoryId,
        subCategory,
        vendorId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateToEnd,
        locationId,
        lowStock,
        lowStockVariationIds,
      };
      const { products, totalItems } =
        await this.repo.findAllProductsByTotalStock(
          stockFilters,
          sortOrder,
          skip,
          limit,
        );
      const paginationResult = createPaginationResult(
        products,
        totalItems,
        page,
        limit,
      );
      return {
        ...paginationResult,
        locationId: locationId ?? null,
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_PRODUCT_SORT_FIELDS,
    ) ?? {
      dateCreated: "desc",
    };
    if (sortBy?.toLowerCase() === "vendorname") {
      orderBy = { vendor: { name: sortOrder } };
    }
    // Add id tiebreaker for deterministic pagination (avoids duplicates across pages)
    const orderByWithTiebreaker: Prisma.ProductOrderByWithRelationInput[] =
      Array.isArray(orderBy)
        ? [...orderBy, { id: "asc" as const }]
        : [orderBy, { id: "asc" as const }];

    // List filters — keep aligned with ProductRepository.buildProductListWhereSql (totalStock sort path).
    const where: ProductListWhere = {};
    if (search) {
      where.OR = [
        { imsCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          category: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (subCategory && !subCategoryId) {
      where.subCategory = {
        equals: subCategory,
        mode: "insensitive",
      };
    }
    if (vendorId) where.vendorId = vendorId;
    if (dateFrom || dateTo) {
      where.dateCreated = {};
      if (dateFrom) where.dateCreated.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.dateCreated!.lte = to;
      }
    }

    if (locationId || lowStock) {
      if (locationId && lowStock && lowStockVariationIds.length > 0) {
        where.variations = {
          some: {
            id: { in: lowStockVariationIds },
            locationInventory: {
              some: { locationId, quantity: { gt: 0 } },
            },
          },
        };
      } else if (locationId) {
        where.variations = {
          some: {
            locationInventory: {
              some: { locationId, quantity: { gt: 0 } },
            },
          },
        };
      } else if (lowStock && lowStockVariationIds.length > 0) {
        where.variations = {
          some: { id: { in: lowStockVariationIds } },
        };
      } else if (lowStock) {
        where.variations = { some: { id: { in: [] } } };
      }
    }

    const { products, totalItems } = await this.repo.findAllProducts(
      tenantId,
      where,
      orderByWithTiebreaker,
      skip,
      limit,
    );

    const paginationResult = createPaginationResult(
      products,
      totalItems,
      page,
      limit,
    );
    return {
      ...paginationResult,
      locationId: locationId ?? null,
    };
  }

  async findById(id: string) {
    const product = await this.repo.findProductById(id);
    if (!product) throw createError("Product not found", 404);
    return product;
  }

  async getByImsCode(
    tenantId: string,
    params: { imsCode: string; locationId?: string },
  ) {
    const product = await this.repo.findByTenantAndImsCode(
      tenantId,
      params.imsCode,
      {
        locationId: params.locationId,
      },
    );
    if (!product) throw createError("Product not found", 404);
    return product;
  }

  async update(
    id: string,
    data: UpdateProductDto,
    ctx: { tenantId: string; userId: string; ip?: string; userAgent?: string },
  ) {
    const { tenantId, userId, ip, userAgent } = ctx;

    const existingProduct = await this.repo.findProductForUpdate(id);
    if (!existingProduct) {
      const err = createError("Product not found", 404) as Error & {
        productId?: string;
      };
      err.productId = id;
      throw err;
    }

    if (data.categoryId !== undefined) {
      const category = await this.repo.findCategoryByIdAndTenant(
        tenantId,
        data.categoryId,
      );
      if (!category) throw createError("Category not found", 404);
    }

    if (data.vendorId) {
      const vendor = await this.repo.findVendorById(data.vendorId);
      if (!vendor) {
        const err = createError("Vendor not found", 404) as Error & {
          providedVendorId?: string;
        };
        err.providedVendorId = data.vendorId;
        throw err;
      }
    }

    const updateData: Prisma.ProductUncheckedUpdateInput = {};
    if (data.imsCode !== undefined) updateData.imsCode = data.imsCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.description !== undefined)
      updateData.description = data.description ?? null;
    if (data.subCategory !== undefined) {
      updateData.subCategory = data.subCategory?.trim().length
        ? data.subCategory.trim()
        : null;
    }
    if (data.length !== undefined) updateData.length = data.length ?? null;
    if (data.breadth !== undefined) updateData.breadth = data.breadth ?? null;
    if (data.height !== undefined) updateData.height = data.height ?? null;
    if (data.weight !== undefined) updateData.weight = data.weight ?? null;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.mrp !== undefined) updateData.mrp = data.mrp;
    if (data.vendorId !== undefined)
      updateData.vendorId = data.vendorId ?? null;

    if (data.variations !== undefined) {
      const existingVariations =
        await this.repo.findVariationsWithDependents(id);
      const incomingVariations = Array.isArray(data.variations)
        ? data.variations
        : [];
      const incomingIds = new Set(
        incomingVariations
          .map((v) => v.id)
          .filter((x): x is string => Boolean(x)),
      );

      for (const existing of existingVariations) {
        const hasDependents =
          (existing._count?.saleItems ?? 0) > 0 ||
          (existing._count?.transferItems ?? 0) > 0;

        if (incomingIds.has(existing.id)) {
          const payload = incomingVariations.find((v) => v.id === existing.id);
          if (payload) {
            const newPhotos =
              payload.photos && Array.isArray(payload.photos)
                ? payload.photos.map((p) => ({
                    photoUrl: p.photoUrl,
                    isPrimary: p.isPrimary ?? false,
                  }))
                : [];
            if (newPhotos.length > 0) {
              await this.repo.deleteVariationPhotos(existing.id);
            }
            const incomingSubArr =
              payload.subVariants && Array.isArray(payload.subVariants)
                ? payload.subVariants
                    .map((s: string | { name?: string }) =>
                      typeof s === "string" ? s.trim() : (s?.name ?? "").trim(),
                    )
                    .filter((x): x is string => Boolean(x))
                : [];
            const incomingSubNames = new Set(incomingSubArr);
            const existingSubs = existing.subVariations ?? [];
            for (const sub of existingSubs) {
              if (!incomingSubNames.has(sub.name)) {
                const invCount =
                  await this.repo.countLocationInventoryForSubVariation(sub.id);
                const saleCount = await this.repo.countSaleItemsForSubVariation(
                  sub.id,
                );
                const transferCount =
                  await this.repo.countTransferItemsForSubVariation(sub.id);
                const subDependents = invCount + saleCount + transferCount;
                if (subDependents === 0) {
                  await this.repo.deleteProductSubVariation(sub.id);
                }
              }
            }
            for (const name of incomingSubNames) {
              const exists = existingSubs.some((s) => s.name === name);
              if (!exists) {
                await this.repo.createProductSubVariation(existing.id, name);
              }
            }
            // Sync EAV attributes (e.g. change Size from M to S)
            if (payload.attributes !== undefined) {
              const attrs = Array.isArray(payload.attributes)
                ? payload.attributes.filter(
                    (
                      a,
                    ): a is {
                      attributeTypeId: string;
                      attributeValueId: string;
                    } => Boolean(a?.attributeTypeId && a?.attributeValueId),
                  )
                : [];
              await this.repo.setVariationAttributes(existing.id, attrs);
            }
            // Update LocationInventory if a specific location was provided
            if (
              payload.locationId &&
              payload.stockQuantity !== undefined &&
              payload.stockQuantity !== null
            ) {
              const locInv = await this.repo.findLocationInventory(
                payload.locationId,
                existing.id,
                null,
              );
              if (locInv) {
                await this.repo.setLocationInventoryQuantity(
                  locInv.id,
                  payload.stockQuantity,
                );
              } else {
                await this.repo.createLocationInventory({
                  locationId: payload.locationId,
                  variationId: existing.id,
                  subVariationId: null,
                  quantity: payload.stockQuantity,
                });
              }
              // Recalculate ProductVariation.stockQuantity as the sum of all LocationInventory rows
              const allInv =
                await this.repo.findAllLocationInventoryForVariation(
                  existing.id,
                );
              const totalStock = allInv.reduce(
                (sum, inv) => sum + inv.quantity,
                0,
              );
              await this.repo.updateProductVariation(existing.id, {
                stockQuantity: totalStock,
                ...(newPhotos.length > 0
                  ? { photos: { create: newPhotos } }
                  : {}),
              });
            } else {
              await this.repo.updateProductVariation(existing.id, {
                stockQuantity: payload.stockQuantity ?? existing.stockQuantity,
                ...(newPhotos.length > 0
                  ? { photos: { create: newPhotos } }
                  : {}),
              });
            }
          }
        } else if (!hasDependents) {
          await this.repo.deleteProductVariation(existing.id);
        }
      }

      const existingIdSet = new Set(existingVariations.map((e) => e.id));
      const hasNewVariations = incomingVariations.some(
        (v) => !v.id || !existingIdSet.has(v.id),
      );
      let warehouseLocation: { id: string } | null = null;
      if (hasNewVariations) {
        warehouseLocation = await this.repo.findDefaultWarehouse(tenantId);
        if (!warehouseLocation) {
          throw createError(
            "Cannot add variations: tenant has no default warehouse. Set one in Locations.",
            400,
          );
        }
      }

      for (const variation of incomingVariations) {
        if (variation.id && existingIdSet.has(variation.id)) continue;

        const newVariation = await this.repo.createProductVariation(
          {
            tenantId,
            productId: id,
            stockQuantity: variation.stockQuantity ?? 0,
            costPriceOverride:
              variation.costPriceOverride != null
                ? Number(variation.costPriceOverride)
                : null,
            mrpOverride:
              variation.mrpOverride != null
                ? Number(variation.mrpOverride)
                : null,
            finalSpOverride:
              variation.finalSpOverride != null
                ? Number(variation.finalSpOverride)
                : null,
            photos: variation.photos?.length
              ? {
                  create: variation.photos.map((p) => ({
                    photoUrl: p.photoUrl,
                    isPrimary: p.isPrimary ?? false,
                  })),
                }
              : undefined,
            subVariations: variation.subVariants?.length
              ? {
                  create: variation.subVariants
                    .map((n: string | { name?: string }) =>
                      typeof n === "string" ? n.trim() : (n?.name ?? "").trim(),
                    )
                    .filter(Boolean)
                    .map((name) => ({ name })),
                }
              : undefined,
            attributes: variation.attributes?.length
              ? {
                  create: variation.attributes.map((a) => ({
                    attributeTypeId: a.attributeTypeId,
                    attributeValueId: a.attributeValueId,
                  })),
                }
              : undefined,
          },
          { includeSubVariations: true },
        );

        if (warehouseLocation) {
          const subVariations = Array.isArray(
            (newVariation as { subVariations?: Array<{ id: string }> })
              .subVariations,
          )
            ? (newVariation as { subVariations: Array<{ id: string }> })
                .subVariations
            : [];
          if (subVariations.length > 0) {
            for (const sub of subVariations) {
              const existing = await this.repo.findLocationInventory(
                warehouseLocation.id,
                newVariation.id,
                sub.id,
              );
              if (!existing) {
                await this.repo.createLocationInventory({
                  locationId: warehouseLocation.id,
                  variationId: newVariation.id,
                  subVariationId: sub.id,
                  quantity: 0,
                });
              }
            }
          } else {
            const qty = Math.max(0, Number(variation.stockQuantity) || 0);
            const existing = await this.repo.findLocationInventory(
              warehouseLocation.id,
              newVariation.id,
              null,
            );
            if (existing) {
              await this.repo.updateLocationInventoryQuantity(existing.id, qty);
            } else {
              await this.repo.createLocationInventory({
                locationId: warehouseLocation.id,
                variationId: newVariation.id,
                subVariationId: null,
                quantity: qty,
              });
            }
          }
        }
      }
    }

    if (data.discounts !== undefined) {
      await this.repo.deleteProductDiscounts(id);
      if (data.discounts.length > 0) {
        const resolved: Prisma.ProductDiscountUncheckedCreateWithoutProductInput[] =
          [];
        for (const discount of data.discounts) {
          const discountType = await this.repo.findDiscountTypeByIdAndTenant(
            tenantId,
            discount.discountTypeId,
          );
          if (!discountType) {
            const err = createError("Discount type not found", 404) as Error & {
              providedDiscountTypeId?: string;
            };
            err.providedDiscountTypeId = discount.discountTypeId;
            throw err;
          }
          const pct = Number(discount.discountPercentage);
          resolved.push({
            discountTypeId: discountType.id,
            discountPercentage: pct,
            valueType: discount.valueType,
            value: discount.value ?? pct,
            startDate: parseDate(discount.startDate ?? "")?.toJSDate() ?? null,
            endDate: parseDate(discount.endDate ?? "")?.toJSDate() ?? null,
            isActive: discount.isActive,
          } as Prisma.ProductDiscountUncheckedCreateWithoutProductInput);
        }
        if (resolved.length > 0) {
          await this.repo.createProductDiscounts(id, resolved);
        }
      }
    }

    if (data.attributeTypeIds !== undefined) {
      await this.repo.deleteProductAttributeTypes(id);
      if (
        Array.isArray(data.attributeTypeIds) &&
        data.attributeTypeIds.length > 0
      ) {
        const validTypeIds = await this.repo.findAttributeTypesByIdsAndTenant(
          tenantId,
          data.attributeTypeIds,
        );
        if (validTypeIds.length > 0) {
          await this.repo.createProductAttributeTypes(id, validTypeIds);
        }
      }
    }

    let updatedProduct;
    try {
      updatedProduct = await this.repo.updateProduct(id, updateData);
    } catch (err: unknown) {
      throw this.mapPrismaConflict(err);
    }

    try {
      await this.repo.createAuditLog({
        userId,
        action: "UPDATE_PRODUCT",
        resource: "product",
        resourceId: updatedProduct.id,
        details: { name: updatedProduct.name },
        ip,
        userAgent,
      });
    } catch {
      // Audit log failure is non-fatal
    }

    return updatedProduct;
  }

  async delete(
    id: string,
    ctx: {
      userId: string;
      tenantId: string;
      reason?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const existing = await this.repo.findProductForUpdate(id);
    if (!existing) throw createError("Product not found", 404);
    await this.repo.softDeleteProduct(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      resource: "Product",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async deleteVariation(
    productId: string,
    variationId: string,
    tenantId: string,
  ) {
    const variation = await this.repo.findVariationForDelete(
      variationId,
      productId,
      tenantId,
    );
    if (!variation) throw createError("Variation not found", 404);

    const hasDependents =
      (variation._count?.saleItems ?? 0) > 0 ||
      (variation._count?.transferItems ?? 0) > 0;
    if (hasDependents) {
      throw createError(
        "Cannot delete this variation because it has associated sales or transfers. Remove those records first.",
        409,
      );
    }

    const siblingCount = await this.repo.countProductVariations(
      productId,
      variationId,
    );
    if (siblingCount === 0) {
      throw createError(
        "Cannot delete the last variation of a product. Delete the product instead.",
        400,
      );
    }

    await this.repo.deleteProductVariation(variationId);
  }

  async findAllCategories(tenantId: string, query: GetListQueryDto) {
    const params = getPaginationParams(query);
    return this.repo.findAllCategories(tenantId, params);
  }

  async findAllDiscountTypes(tenantId: string, query: GetListQueryDto) {
    const params = getPaginationParams(query);
    return this.repo.findAllDiscountTypes(tenantId, params);
  }

  async createDiscountType(tenantId: string, data: CreateDiscountTypeDto) {
    const trimmedName = data.name.trim();
    const existing = await this.repo.findDiscountTypeByName(
      tenantId,
      trimmedName,
    );
    if (existing) {
      const err = createError(
        "A discount type with this name already exists",
        409,
      ) as Error & { existingId?: string };
      err.existingId = existing.id;
      throw err;
    }
    const pct =
      data.defaultPercentage != null
        ? Math.min(100, Math.max(0, Number(data.defaultPercentage)))
        : null;
    return this.repo.createDiscountType({
      tenantId,
      name: trimmedName,
      description:
        typeof data.description === "string" && data.description.trim()
          ? data.description.trim()
          : null,
      defaultPercentage: pct,
    });
  }

  async updateDiscountType(
    id: string,
    tenantId: string,
    data: UpdateDiscountTypeDto,
  ) {
    const existing = await this.repo.findDiscountTypeByIdAndTenantForUpdate(
      id,
      tenantId,
    );
    if (!existing) {
      const err = createError("Discount type not found", 404) as Error & {
        discountTypeId?: string;
      };
      err.discountTypeId = id;
      throw err;
    }

    const updateData: {
      name?: string;
      description?: string | null;
      defaultPercentage?: number | null;
    } = {};
    if (data.name !== undefined) {
      const trimmed = typeof data.name === "string" ? data.name.trim() : "";
      if (!trimmed) throw createError("Name cannot be empty", 400);
      const duplicate = await this.repo.findDiscountTypeByNameExcluding(
        tenantId,
        trimmed,
        id,
      );
      if (duplicate) {
        throw createError(
          "Another discount type with this name already exists",
          409,
        );
      }
      updateData.name = trimmed;
    }
    if (data.description !== undefined) {
      updateData.description =
        typeof data.description === "string" && data.description?.trim()
          ? data.description.trim()
          : null;
    }
    if (data.defaultPercentage !== undefined) {
      updateData.defaultPercentage =
        data.defaultPercentage == null
          ? null
          : Math.min(100, Math.max(0, Number(data.defaultPercentage)));
    }

    return this.repo.updateDiscountType(id, updateData);
  }

  async deleteDiscountType(id: string, tenantId: string) {
    const existing = await this.repo.findDiscountTypeWithProductCount(
      id,
      tenantId,
    );
    if (!existing) {
      const err = createError("Discount type not found", 404) as Error & {
        discountTypeId?: string;
      };
      err.discountTypeId = id;
      throw err;
    }
    if (existing._count.productDiscounts > 0) {
      const err = createError(
        "Cannot delete: this discount type is in use by one or more products. Remove it from products first.",
        400,
      ) as Error & { productDiscountsCount?: number };
      err.productDiscountsCount = existing._count.productDiscounts;
      throw err;
    }
    await this.repo.deleteDiscountType(id);
  }

  async findAllProductDiscounts(
    tenantId: string,
    query: GetProductDiscountsListQueryDto,
  ) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const productId = query.productId as string | undefined;
    const categoryId = query.categoryId as string | undefined;
    const subCategoryId = query.subCategoryId as string | undefined;
    const discountTypeId = query.discountTypeId as string | undefined;

    const where: Prisma.ProductDiscountWhereInput = {};
    if (productId) where.productId = productId;
    if (categoryId || subCategoryId) {
      where.product = {};
      if (categoryId) where.product.categoryId = categoryId;
      if (subCategoryId) where.product.subCategoryId = subCategoryId;
    }
    if (discountTypeId) where.discountTypeId = discountTypeId;

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        {
          product: {
            imsCode: { contains: search, mode: "insensitive" },
          },
        },
        {
          discountType: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    let orderBy: Prisma.ProductDiscountOrderByWithRelationInput =
      getPrismaOrderBy(sortBy, sortOrder, ALLOWED_DISCOUNT_SORT_FIELDS) ?? {
        createdAt: "desc",
      };
    if (sortBy?.toLowerCase() === "productname") {
      orderBy = { product: { name: sortOrder } };
    }
    if (sortBy?.toLowerCase() === "discounttypename") {
      orderBy = { discountType: { name: sortOrder } };
    }

    const skip = (page - 1) * limit;
    const { discounts, totalItems } = await this.repo.findAllProductDiscounts(
      tenantId,
      where,
      orderBy,
      skip,
      limit,
    );

    return createPaginationResult(discounts, totalItems, page, limit);
  }

  async getProductDiscounts(productId: string, tenantId: string) {
    const product = await this.repo.findProductByIdForTenant(
      productId,
      tenantId,
    );
    if (!product) throw createError("Product not found", 404);

    const discounts = await this.repo.findActiveProductDiscounts(productId);
    return discounts.map((d) => {
      const dt = d.discountType;
      const effectiveValue = Number(d.value) || Number(d.discountPercentage);
      return {
        id: d.id,
        name: dt.name,
        value: effectiveValue,
        valueType: d.valueType,
        discountType: dt.name,
        discountTypeId: dt.id,
        startDate: d.startDate,
        endDate: d.endDate,
      };
    });
  }

  async getProductsForExport(
    tenantId: string,
    query: {
      ids?: string[];
      search?: string;
      locationId?: string;
      categoryId?: string;
      subCategoryId?: string;
      subCategory?: string;
      vendorId?: string;
      dateFrom?: string;
      dateTo?: string;
      lowStock?: boolean;
    },
  ) {
    if (query.ids && query.ids.length > 0) {
      const products = await this.repo.findProductsForExport(
        tenantId,
        query.ids,
      );
      if (products.length === 0) {
        throw createError("No products found to export", 404);
      }
      return products;
    }

    const where = await this.buildProductListWhere({
      search: query.search,
      locationId: query.locationId,
      categoryId: query.categoryId,
      subCategoryId: query.subCategoryId,
      subCategory: query.subCategory,
      vendorId: query.vendorId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      lowStock: query.lowStock,
    });
    const orderBy = { dateCreated: "desc" as const };
    const products = await this.repo.findProductsForExportByFilter(
      tenantId,
      where,
      orderBy,
    );
    if (products.length === 0) {
      throw createError("No products found to export", 404);
    }
    return products;
  }

  private async buildProductListWhere(params: {
    search?: string;
    locationId?: string;
    categoryId?: string;
    subCategoryId?: string;
    subCategory?: string;
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    lowStock?: boolean;
  }): Promise<ProductListWhere> {
    const {
      search,
      locationId,
      categoryId,
      subCategoryId,
      subCategory,
      vendorId,
      dateFrom,
      dateTo,
      lowStock,
    } = params;
    const where: ProductListWhere = {};
    if (search) {
      where.OR = [
        { imsCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          category: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (subCategory && !subCategoryId) {
      where.subCategory = {
        equals: subCategory,
        mode: "insensitive",
      };
    }
    if (vendorId) where.vendorId = vendorId;
    if (dateFrom || dateTo) {
      where.dateCreated = {};
      if (dateFrom) where.dateCreated.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.dateCreated!.lte = to;
      }
    }
    let lowStockVariationIds: string[] = [];
    if (lowStock) {
      lowStockVariationIds =
        await this.repo.getLowStockVariationIds(LOW_STOCK_THRESHOLD);
    }
    if (locationId || lowStock) {
      if (locationId && lowStock && lowStockVariationIds.length > 0) {
        where.variations = {
          some: {
            id: { in: lowStockVariationIds },
            locationInventory: {
              some: { locationId, quantity: { gt: 0 } },
            },
          },
        };
      } else if (locationId) {
        where.variations = {
          some: {
            locationInventory: {
              some: { locationId, quantity: { gt: 0 } },
            },
          },
        };
      } else if (lowStock && lowStockVariationIds.length > 0) {
        where.variations = {
          some: { id: { in: lowStockVariationIds } },
        };
      } else if (lowStock) {
        where.variations = { some: { id: { in: [] } } };
      }
    }
    return where;
  }
}

export default new ProductService(productRepository);
