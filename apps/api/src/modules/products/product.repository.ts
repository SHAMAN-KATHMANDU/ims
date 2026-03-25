import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { Prisma } from "@prisma/client";
import { maxNumericSuffixForPrefix } from "./ims-code";

/** Filters for raw SQL product list when ordering by aggregated stock (mirrors ProductService.findAll). */
export interface ProductStockSortFilters {
  tenantId: string;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  subCategory?: string;
  vendorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  locationId?: string;
  lowStock?: boolean;
  lowStockVariationIds?: string[];
}

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
  /** When set, used as product id (e.g. so imsCode can default to this id). */
  id?: string;
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
        orderBy: { location: { name: "asc" } },
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

  // Product - lookup by product code (product-level barcode for POS)
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

  findTenantSlugAndName(tenantId: string) {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    });
  }

  async getMaxImsCodeNumericSuffix(tenantId: string, prefix: string) {
    const rows = await prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        imsCode: { startsWith: prefix },
      },
      select: { imsCode: true },
    });
    return maxNumericSuffixForPrefix(
      rows.map((r) => r.imsCode),
      prefix,
    );
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
    orderBy:
      | Prisma.ProductOrderByWithRelationInput
      | Prisma.ProductOrderByWithRelationInput[],
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

  /** Replace all EAV attributes for a variation (e.g. when changing Size M → S). */
  setVariationAttributes(
    variationId: string,
    attributes: Array<{
      attributeTypeId: string;
      attributeValueId: string;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.productVariationAttribute.deleteMany({
        where: { variationId },
      });
      if (attributes.length > 0) {
        await tx.productVariationAttribute.createMany({
          data: attributes.map((a) => ({
            variationId,
            attributeTypeId: a.attributeTypeId,
            attributeValueId: a.attributeValueId,
          })),
        });
      }
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
    imsCode: string | null | undefined,
    name: string,
  ) {
    const nameTrim = name.trim();
    const codeTrim = imsCode?.trim() ?? "";
    const orFilter: Prisma.ProductWhereInput[] =
      codeTrim.length > 0
        ? [{ imsCode: codeTrim }, { name: nameTrim }]
        : [{ name: nameTrim }];
    return prisma.product.findFirst({
      where: {
        tenantId,
        OR: orFilter,
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

  /**
   * WHERE clause for product list (stock sort path).
   *
   * **Coupling — keep in sync with ORM:** The Prisma `where` in `ProductService.findAll`
   * (search OR on imsCode/name/description/category name, categoryId, subCategoryId,
   * subCategory string match, vendorId, dateCreated range, and variations +
   * locationInventory / lowStock variation IDs) must mirror this SQL. When list filters
   * change, update **both** this builder and the ORM branch in `findAll`, or stock-sorted
   * pages will return different rows than other sort modes.
   */
  private buildProductListWhereSql(f: ProductStockSortFilters): Prisma.Sql {
    const clauses: Prisma.Sql[] = [
      Prisma.sql`p.tenant_id = ${f.tenantId}::uuid`,
      Prisma.sql`p.deleted_at IS NULL`,
    ];
    if (f.categoryId) {
      clauses.push(Prisma.sql`p.category_id = ${f.categoryId}::uuid`);
    }
    if (f.subCategoryId) {
      clauses.push(Prisma.sql`p.sub_category_id = ${f.subCategoryId}::uuid`);
    }
    if (f.subCategory && !f.subCategoryId) {
      clauses.push(
        Prisma.sql`LOWER(TRIM(COALESCE(p.sub_category, ''))) = LOWER(TRIM(${f.subCategory}))`,
      );
    }
    if (f.vendorId) {
      clauses.push(Prisma.sql`p.vendor_id = ${f.vendorId}::uuid`);
    }
    if (f.dateFrom) {
      clauses.push(Prisma.sql`p.date_created >= ${f.dateFrom}`);
    }
    if (f.dateTo) {
      clauses.push(Prisma.sql`p.date_created <= ${f.dateTo}`);
    }
    if (f.search?.trim()) {
      const pattern = `%${f.search.trim()}%`;
      clauses.push(Prisma.sql`(
        p.ims_code ILIKE ${pattern}
        OR p.product_name ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM categories cat
          WHERE cat.category_id = p.category_id
            AND cat.tenant_id = p.tenant_id
            AND cat.deleted_at IS NULL
            AND cat.category_name ILIKE ${pattern}
        )
      )`);
    }

    const lowIds = f.lowStockVariationIds ?? [];
    if (f.locationId || f.lowStock) {
      if (f.locationId && f.lowStock && lowIds.length > 0) {
        const idList = Prisma.join(
          lowIds.map((id) => Prisma.sql`${id}::uuid`),
          ", ",
        );
        clauses.push(Prisma.sql`EXISTS (
          SELECT 1 FROM product_variations v
          INNER JOIN location_inventory li ON li.variation_id = v.variation_id
          WHERE v.product_id = p.product_id
            AND v.variation_id IN (${idList})
            AND li.location_id = ${f.locationId}::uuid
            AND li.quantity > 0
        )`);
      } else if (f.locationId) {
        clauses.push(Prisma.sql`EXISTS (
          SELECT 1 FROM product_variations v2
          INNER JOIN location_inventory li2 ON li2.variation_id = v2.variation_id
          WHERE v2.product_id = p.product_id
            AND li2.location_id = ${f.locationId}::uuid
            AND li2.quantity > 0
        )`);
      } else if (f.lowStock && lowIds.length > 0) {
        const idList = Prisma.join(
          lowIds.map((id) => Prisma.sql`${id}::uuid`),
          ", ",
        );
        clauses.push(Prisma.sql`EXISTS (
          SELECT 1 FROM product_variations v3
          WHERE v3.product_id = p.product_id
            AND v3.variation_id IN (${idList})
        )`);
      } else if (f.lowStock) {
        clauses.push(Prisma.sql`FALSE`);
      }
    }

    return Prisma.join(clauses, " AND ");
  }

  /**
   * Paginated product list ordered by aggregated total stock (all variations).
   *
   * **Performance:** Uses a correlated subquery evaluated per matching row before pagination.
   * For very large catalogs, monitor query latency (APM, `EXPLAIN ANALYZE`). If this path is
   * hot, consider a denormalized `total_stock` on `products` (maintained by triggers or a job)
   * and sort on that column instead of computing per request.
   *
   * **Stock definition** matches frontend getVariationTotal/getTotalStock: per variation,
   * COALESCE(SUM(location_inventory.quantity), stock_quantity); then sum over variations.
   */
  async findAllProductsByTotalStock(
    filters: ProductStockSortFilters,
    sortOrder: "asc" | "desc",
    skip: number,
    take: number,
  ): Promise<{
    products: Prisma.ProductGetPayload<{
      include: typeof PRODUCT_INCLUDE_WITH_INVENTORY;
    }>[];
    totalItems: number;
  }> {
    const whereSql = this.buildProductListWhereSql(filters);
    const orderDir = sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const [countRows, idRows] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        WITH filtered_products AS (
          SELECT p.product_id
          FROM products p
          WHERE ${whereSql}
        )
        SELECT COUNT(*)::bigint AS count
        FROM filtered_products
      `,
      prisma.$queryRaw<{ product_id: string }[]>`
        WITH filtered_products AS (
          SELECT p.product_id
          FROM products p
          WHERE ${whereSql}
        ),
        product_stock AS (
          SELECT
            fp.product_id,
            COALESCE(
              SUM(
                COALESCE(inv.quantity_sum, v.stock_quantity::bigint)
              ),
              0
            )::bigint AS total_stock
          FROM filtered_products fp
          LEFT JOIN product_variations v ON v.product_id = fp.product_id
          LEFT JOIN LATERAL (
            SELECT SUM(li.quantity)::bigint AS quantity_sum
            FROM location_inventory li
            WHERE li.variation_id = v.variation_id
          ) inv ON TRUE
          GROUP BY fp.product_id
        )
        SELECT ps.product_id
        FROM product_stock ps
        ORDER BY ps.total_stock ${orderDir}, ps.product_id ASC
        LIMIT ${take} OFFSET ${skip}
      `,
    ]);

    const totalItems = Number(countRows[0]?.count ?? 0n);
    const orderedIds = idRows.map((r) => r.product_id);
    if (orderedIds.length === 0) {
      return { products: [], totalItems };
    }

    const productsUnordered = await prisma.product.findMany({
      where: {
        id: { in: orderedIds },
        tenantId: filters.tenantId,
        deletedAt: null,
      },
      include: PRODUCT_INCLUDE_WITH_INVENTORY,
    });
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    const products = [...productsUnordered].sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    return { products, totalItems };
  }
}

export default new ProductRepository();
