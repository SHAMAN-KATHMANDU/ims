import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { Prisma } from "@prisma/client";

// ─── Types for repository inputs ────────────────────────────────────────────

export interface ProductCreateVariationInput {
  tenantId: string;
  stockQuantity: number;
  costPriceOverride: number | null;
  mrpOverride: number | null;
  finalSpOverride: number | null;
  photos?: Array<{ photoUrl: string; isPrimary: boolean }>;
  subVariations?: Array<{ name: string }>;
  attributes?: Array<{
    attributeTypeId: string;
    attributeValueId: string;
  }>;
}

export interface ProductCreateDiscountInput {
  discountTypeId: string;
  discountPercentage: number;
  valueType: string;
  value: number;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
}

export interface ProductCreateData {
  tenantId: string;
  imsCode: string;
  name: string;
  categoryId: string;
  description: string | null;
  subCategory: string | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  weight: number | null;
  costPrice: number;
  mrp: number;
  vendorId: string | null;
  createdById: string;
  variations?: { create: Prisma.ProductVariationCreateWithoutProductInput[] };
  discounts?: {
    create: Prisma.ProductDiscountUncheckedCreateWithoutProductInput[];
  };
}

export interface ProductListWhere {
  OR?: Prisma.ProductWhereInput[];
  categoryId?: string;
  subCategoryId?: string;
  subCategory?: Prisma.StringFilter;
  vendorId?: string;
  dateCreated?: { gte?: Date; lte?: Date };
  variations?: Prisma.ProductVariationListRelationFilter;
}

const PRODUCT_INCLUDE_FULL = {
  category: true,
  createdBy: { select: { id: true, username: true, role: true } },
  variations: {
    include: {
      photos: true,
      subVariations: true,
      attributes: {
        include: {
          attributeType: { select: { id: true, name: true, code: true } },
          attributeValue: { select: { id: true, value: true, code: true } },
        },
      },
    },
  },
  discounts: { include: { discountType: true } },
} as const;

const PRODUCT_INCLUDE_WITH_INVENTORY = {
  category: true,
  vendor: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true, role: true } },
  productAttributeTypes: {
    include: {
      attributeType: { select: { id: true, name: true, code: true } },
    },
  },
  variations: {
    include: {
      photos: true,
      subVariations: { select: { id: true, name: true } },
      attributes: {
        include: {
          attributeType: { select: { id: true, name: true, code: true } },
          attributeValue: { select: { id: true, value: true, code: true } },
        },
      },
      locationInventory: {
        select: {
          quantity: true,
          subVariationId: true,
          subVariation: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, type: true } },
        },
      },
    },
  },
  discounts: { include: { discountType: true } },
} as const;

// ─── ProductRepository ──────────────────────────────────────────────────────

export class ProductRepository {
  // Category
  findCategoryByIdAndTenant(tenantId: string, categoryId: string) {
    return prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });
  }

  // Vendor
  findVendorById(id: string) {
    return prisma.vendor.findUnique({ where: { id } });
  }

  // DiscountType
  findDiscountTypeByIdAndTenant(tenantId: string, id: string) {
    return prisma.discountType.findFirst({
      where: { id, tenantId },
    });
  }

  findProductIdByTenantAndImsCode(tenantId: string, imsCode: string) {
    return prisma.product.findFirst({
      where: { tenantId, imsCode: imsCode.trim(), deletedAt: null },
      select: { id: true },
    });
  }

  // Product - lookup by IMS code (product-level barcode for POS)
  findByTenantAndImsCode(
    tenantId: string,
    imsCode: string,
    options?: { locationId?: string },
  ) {
    return prisma.product.findFirst({
      where: { tenantId, imsCode: imsCode.trim(), deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        variations: {
          where: { isActive: true },
          include: {
            attributes: {
              include: {
                attributeType: { select: { id: true, name: true, code: true } },
                attributeValue: {
                  select: { id: true, value: true, code: true },
                },
              },
            },
            subVariations: { select: { id: true, name: true } },
            photos: { where: { isPrimary: true }, take: 1 },
            ...(options?.locationId
              ? {
                  locationInventory: {
                    where: { locationId: options.locationId },
                    select: {
                      quantity: true,
                      subVariationId: true,
                      subVariation: { select: { id: true, name: true } },
                    },
                  },
                }
              : {}),
          },
        },
      },
    });
  }

  // Location
  findLocationByIdAndTenant(
    tenantId: string,
    locationId: string,
    options?: { isActive?: boolean },
  ) {
    const where: Prisma.LocationWhereInput = { id: locationId, tenantId };
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    return prisma.location.findFirst({
      where,
      select: { id: true, type: true },
    });
  }

  findDefaultWarehouse(tenantId: string) {
    return prisma.location.findFirst({
      where: {
        tenantId,
        type: "WAREHOUSE",
        isDefaultWarehouse: true,
        isActive: true,
      },
      select: { id: true },
    });
  }

  // Product - create
  createProduct(data: ProductCreateData) {
    return prisma.product.create({
      data: {
        tenantId: data.tenantId,
        imsCode: data.imsCode,
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        subCategory: data.subCategory,
        length: data.length,
        breadth: data.breadth,
        height: data.height,
        weight: data.weight,
        costPrice: data.costPrice,
        mrp: data.mrp,
        vendorId: data.vendorId,
        createdById: data.createdById,
        variations: data.variations,
        discounts: data.discounts,
      },
      include: PRODUCT_INCLUDE_FULL,
    });
  }

  // ProductAttributeType
  createProductAttributeTypes(
    productId: string,
    attributeTypeIds: Array<{ id: string }>,
  ) {
    return prisma.productAttributeType.createMany({
      data: attributeTypeIds.map((t, i) => ({
        productId,
        attributeTypeId: t.id,
        displayOrder: i,
      })),
      skipDuplicates: true,
    });
  }

  findAttributeTypesByIdsAndTenant(tenantId: string, ids: string[]) {
    return prisma.attributeType.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });
  }

  // LocationInventory
  findLocationInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return prisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId,
      },
    });
  }

  createLocationInventory(data: {
    locationId: string;
    variationId: string;
    subVariationId: string | null;
    quantity: number;
  }) {
    return prisma.locationInventory.create({ data });
  }

  updateLocationInventoryQuantity(id: string, quantityIncrement: number) {
    return prisma.locationInventory.update({
      where: { id },
      data: { quantity: { increment: quantityIncrement } },
    });
  }

  setLocationInventoryQuantity(id: string, quantity: number) {
    return prisma.locationInventory.update({
      where: { id },
      data: { quantity },
    });
  }

  findAllLocationInventoryForVariation(variationId: string) {
    return prisma.locationInventory.findMany({
      where: { variationId },
      select: {
        id: true,
        quantity: true,
        locationId: true,
        subVariationId: true,
      },
    });
  }

  // AuditLog
  createAuditLog(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details?: Prisma.InputJsonValue;
    ip?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({ data });
  }

  // Product - list (getAllProducts)
  async findAllProducts(
    tenantId: string,
    where: ProductListWhere,
    orderBy: Prisma.ProductOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const tenantWhere = { ...where, tenantId, deletedAt: null };
    const [totalItems, products] = await Promise.all([
      prisma.product.count({ where: tenantWhere }),
      prisma.product.findMany({
        where: tenantWhere,
        include: PRODUCT_INCLUDE_WITH_INVENTORY,
        orderBy,
        skip,
        take,
      }),
    ]);
    return { products, totalItems };
  }

  getLowStockVariationIds(threshold: number) {
    return prisma.locationInventory
      .groupBy({
        by: ["variationId"],
        _sum: { quantity: true },
      })
      .then((rows) =>
        rows
          .filter((r) => Number(r._sum?.quantity ?? 0) < threshold)
          .map((r) => r.variationId),
      );
  }

  // Product - get by ID
  findProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        ...PRODUCT_INCLUDE_FULL,
        productAttributeTypes: {
          include: {
            attributeType: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }

  findProductByIdForTenant(id: string, tenantId: string) {
    return prisma.product.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true },
    });
  }

  // Product - update
  findProductForUpdate(id: string) {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  findVariationsWithDependents(productId: string) {
    return prisma.productVariation.findMany({
      where: { productId },
      include: {
        subVariations: true,
        _count: { select: { saleItems: true, transferItems: true } },
      },
    });
  }

  deleteVariationPhotos(variationId: string) {
    return prisma.variationPhoto.deleteMany({
      where: { variationId },
    });
  }

  countLocationInventoryForSubVariation(subVariationId: string) {
    return prisma.locationInventory.count({
      where: { subVariationId },
    });
  }

  countSaleItemsForSubVariation(subVariationId: string) {
    return prisma.saleItem.count({ where: { subVariationId } });
  }

  countTransferItemsForSubVariation(subVariationId: string) {
    return prisma.transferItem.count({ where: { subVariationId } });
  }

  deleteProductSubVariation(id: string) {
    return prisma.productSubVariation.delete({ where: { id } });
  }

  createProductSubVariation(variationId: string, name: string) {
    return prisma.productSubVariation.create({
      data: { variationId, name },
    });
  }

  updateProductVariation(
    id: string,
    data: {
      stockQuantity?: number;
      photos?: { create: Array<{ photoUrl: string; isPrimary: boolean }> };
    },
  ) {
    return prisma.productVariation.update({
      where: { id },
      data,
    });
  }

  deleteProductVariation(id: string) {
    return prisma.productVariation.delete({ where: { id } });
  }

  createProductVariation(
    data: Prisma.ProductVariationUncheckedCreateInput,
    options?: { includeSubVariations?: boolean },
  ) {
    return prisma.productVariation.create({
      data,
      include:
        options?.includeSubVariations === true
          ? { subVariations: { select: { id: true } } }
          : undefined,
    });
  }

  deleteProductDiscounts(productId: string) {
    return prisma.productDiscount.deleteMany({
      where: { productId },
    });
  }

  deleteProductAttributeTypes(productId: string) {
    return prisma.productAttributeType.deleteMany({
      where: { productId },
    });
  }

  updateProduct(
    id: string,
    data: Prisma.ProductUncheckedUpdateInput,
    include?: Prisma.ProductInclude,
  ) {
    return prisma.product.update({
      where: { id },
      data,
      include:
        include ??
        ({
          ...PRODUCT_INCLUDE_WITH_INVENTORY,
          productAttributeTypes: {
            include: {
              attributeType: { select: { id: true, name: true, code: true } },
            },
          },
        } as Prisma.ProductInclude),
    });
  }

  createProductDiscounts(
    productId: string,
    discounts: Prisma.ProductDiscountUncheckedCreateWithoutProductInput[],
  ) {
    return prisma.product.update({
      where: { id: productId },
      data: { discounts: { create: discounts } },
    });
  }

  // Product - soft delete
  softDeleteProduct(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  // Variation - delete single
  findVariationForDelete(
    variationId: string,
    productId: string,
    tenantId: string,
  ) {
    return prisma.productVariation.findFirst({
      where: { id: variationId, productId, tenantId },
      include: { _count: { select: { saleItems: true, transferItems: true } } },
    });
  }

  countProductVariations(productId: string, excludeVariationId?: string) {
    const where: Prisma.ProductVariationWhereInput = { productId };
    if (excludeVariationId) {
      where.id = { not: excludeVariationId };
    }
    return prisma.productVariation.count({ where });
  }

  // Categories (helper)
  async findAllCategories(
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
  ) {
    const { page, limit, sortBy, sortOrder } = query;
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      "id",
      "name",
      "createdAt",
      "updatedAt",
    ]) ?? { name: "asc" as const };
    const where = { tenantId, deletedAt: null };
    const skip = (page - 1) * limit;
    const [totalItems, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        select: { id: true, name: true, description: true },
        orderBy,
        skip,
        take: limit,
      }),
    ]);
    return createPaginationResult(categories, totalItems, page, limit);
  }

  // DiscountType (helper)
  findDiscountTypeByName(tenantId: string, name: string) {
    return prisma.discountType.findFirst({
      where: { tenantId, name },
    });
  }

  findDiscountTypeByNameExcluding(
    tenantId: string,
    name: string,
    excludeId: string,
  ) {
    return prisma.discountType.findFirst({
      where: { tenantId, name, id: { not: excludeId } },
    });
  }

  async findAllDiscountTypes(
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
  ) {
    const { page, limit, sortBy, sortOrder } = query;
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      "id",
      "name",
      "createdAt",
      "updatedAt",
    ]) ?? { name: "asc" as const };
    const where = { tenantId };
    const skip = (page - 1) * limit;
    const [totalItems, discountTypes] = await Promise.all([
      prisma.discountType.count({ where }),
      prisma.discountType.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          defaultPercentage: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);
    return createPaginationResult(discountTypes, totalItems, page, limit);
  }

  createDiscountType(data: {
    tenantId: string;
    name: string;
    description: string | null;
    defaultPercentage: number | null;
  }) {
    return prisma.discountType.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        defaultPercentage: true,
        createdAt: true,
      },
    });
  }

  findDiscountTypeByIdAndTenantForUpdate(id: string, tenantId: string) {
    return prisma.discountType.findFirst({
      where: { id, tenantId },
    });
  }

  updateDiscountType(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      defaultPercentage?: number | null;
    },
  ) {
    return prisma.discountType.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        defaultPercentage: true,
        updatedAt: true,
      },
    });
  }

  findDiscountTypeWithProductCount(id: string, tenantId: string) {
    return prisma.discountType.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { productDiscounts: true } } },
    });
  }

  deleteDiscountType(id: string) {
    return prisma.discountType.delete({ where: { id } });
  }

  // ProductDiscount - list
  async findAllProductDiscounts(
    tenantId: string,
    where: Prisma.ProductDiscountWhereInput,
    orderBy: Prisma.ProductDiscountOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const tenantWhere = { ...where, product: { tenantId } };
    const [totalItems, discounts] = await Promise.all([
      prisma.productDiscount.count({ where: tenantWhere }),
      prisma.productDiscount.findMany({
        where: tenantWhere,
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              categoryId: true,
              subCategory: true,
              subCategoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
          discountType: { select: { id: true, name: true } },
        },
        orderBy,
      }),
    ]);
    return { discounts, totalItems };
  }

  findActiveProductDiscounts(productId: string) {
    const now = new Date();
    return prisma.productDiscount.findMany({
      where: {
        productId,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      include: {
        discountType: { select: { id: true, name: true } },
      },
      orderBy: [
        { discountType: { name: "asc" as const } },
        { value: "desc" as const },
      ],
    });
  }

  // Product - download/export
  findProductsForExport(tenantId: string, ids?: string[]) {
    const where: Prisma.ProductWhereInput = { tenantId, deletedAt: null };
    if (ids && ids.length > 0) where.id = { in: ids };
    return prisma.product.findMany({
      where,
      include: {
        category: true,
        variations: { include: { photos: true } },
        discounts: { include: { discountType: true } },
      },
      orderBy: { dateCreated: "desc" },
    });
  }

  findProductsForExportByFilter(
    tenantId: string,
    where: ProductListWhere,
    orderBy: Prisma.ProductOrderByWithRelationInput,
  ) {
    const tenantWhere = { ...where, tenantId, deletedAt: null };
    const MAX_EXPORT = 50_000;
    return prisma.product.findMany({
      where: tenantWhere,
      include: {
        category: true,
        variations: { include: { photos: true } },
        discounts: { include: { discountType: true } },
      },
      orderBy,
      take: MAX_EXPORT,
    });
  }

  // ─── Bulk upload (product.bulk.service) ────────────────────────────────────

  findCategoriesByTenant(tenantId: string) {
    return prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
  }

  findLocationsByTenant(tenantId: string) {
    return prisma.location.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });
  }

  findVendorsByTenant(tenantId: string) {
    return prisma.vendor.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
  }

  createVendorForTenant(tenantId: string, name: string) {
    return prisma.vendor.create({
      data: { tenantId, name: name.trim() },
      select: { id: true, name: true },
    });
  }

  findCategoryByName(name: string) {
    return prisma.category.findFirst({
      where: { name },
    });
  }

  findCategoriesByNameContains(name: string) {
    return prisma.category.findMany({
      where: { name: { contains: name, mode: "insensitive" } },
    });
  }

  createCategory(tenantId: string, name: string) {
    return prisma.category.create({
      data: { tenantId, name },
    });
  }

  findProductByTenantAndImsOrName(
    tenantId: string,
    imsCode: string,
    name: string,
  ) {
    return prisma.product.findFirst({
      where: {
        tenantId,
        OR: [{ imsCode: imsCode.trim() }, { name: name.trim() }],
      },
      include: { variations: true },
    });
  }

  createProductWithVariations(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({
      data,
      include: { category: true, variations: true },
    });
  }

  upsertProductAttributeType(
    productId: string,
    attributeTypeId: string,
    displayOrder: number,
  ) {
    return prisma.productAttributeType.upsert({
      where: {
        productId_attributeTypeId: { productId, attributeTypeId },
      },
      create: { productId, attributeTypeId, displayOrder },
      update: {},
    });
  }

  findAttributeTypeByCode(tenantId: string, code: string) {
    return prisma.attributeType.findFirst({
      where: { tenantId, code },
      select: { id: true },
    });
  }

  createAttributeType(tenantId: string, name: string, code: string) {
    return prisma.attributeType.create({
      data: { tenantId, name, code: code || "attr", displayOrder: 0 },
      select: { id: true },
    });
  }

  findAttributeValueByTypeAndValue(attributeTypeId: string, value: string) {
    return prisma.attributeValue.findFirst({
      where: { attributeTypeId, value },
      select: { id: true },
    });
  }

  createAttributeValue(attributeTypeId: string, value: string) {
    return prisma.attributeValue.create({
      data: { attributeTypeId, value, displayOrder: 0 },
      select: { id: true },
    });
  }
}

export default new ProductRepository();
