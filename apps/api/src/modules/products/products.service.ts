/**
 * Products service - business logic for products module.
 * Uses products.repository. Framework-independent.
 */

import type { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";
import { AppError, DomainError, NotFoundError } from "@/shared/errors";
import { productsRepository } from "./products.repository";
import { getPrismaOrderBy } from "@/utils/pagination";
import {
  resolveCategory,
  resolveDiscounts,
  createProductWithInventory,
  upsertVariations,
  ProductServiceError,
  type DiscountInput,
  type ResolvedDiscount,
} from "@/services/productService";
import type { AuthContext } from "@/shared/types";
import { AuditAction, AuditResource } from "@/shared/types";
import { createAuditLog } from "@/modules/audit/audit.repository";
import { resolveDiscountTypeFromList } from "./handlers/discountResolutionHandlers";
import { parseDate } from "@repo/shared";
import {
  LOW_STOCK_THRESHOLD,
  buildVariationFilterForList,
} from "./handlers/lowStockFilterHandlers";
const ALLOWED_SORT_FIELDS = [
  "dateCreated",
  "dateModified",
  "name",
  "imsCode",
  "costPrice",
  "mrp",
  "vendorId",
  "id",
];

export type GetAllProductsParams = {
  tenantId: string;
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
};

export async function getAllProducts(params: GetAllProductsParams) {
  const where: Prisma.ProductWhereInput = { tenantId: params.tenantId };

  if (params.search) {
    where.OR = [
      { imsCode: { contains: params.search, mode: "insensitive" } },
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      {
        category: {
          name: { contains: params.search, mode: "insensitive" },
        },
      },
    ];
  }

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.subCategoryId) where.subCategoryId = params.subCategoryId;
  if (params.subCategory && !params.subCategoryId) {
    where.subCategory = { equals: params.subCategory, mode: "insensitive" };
  }
  if (params.vendorId) where.vendorId = params.vendorId;

  if (params.dateFrom || params.dateTo) {
    where.dateCreated = {};
    if (params.dateFrom) {
      where.dateCreated.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      const to = new Date(params.dateTo);
      to.setHours(23, 59, 59, 999);
      where.dateCreated.lte = to;
    }
  }

  let lowStockVariationIds: string[] = [];
  if (params.lowStock) {
    lowStockVariationIds =
      await productsRepository.getLowStockVariationIds(LOW_STOCK_THRESHOLD);
  }

  const variationFilter = buildVariationFilterForList({
    locationId: params.locationId,
    lowStock: params.lowStock,
    lowStockVariationIds,
  });
  if (variationFilter) {
    where.variations = variationFilter;
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    getPrismaOrderBy(params.sortBy, params.sortOrder, ALLOWED_SORT_FIELDS) ??
    (params.sortBy?.toLowerCase() === "vendorname"
      ? ({
          vendor: { name: params.sortOrder },
        } as Prisma.ProductOrderByWithRelationInput)
      : { dateCreated: "desc" });

  const skip = (params.page - 1) * params.limit;

  const [totalItems, products] = await Promise.all([
    productsRepository.countProducts(where),
    productsRepository.findProducts({
      where,
      orderBy,
      skip,
      take: params.limit,
    }),
  ]);

  return { products, totalItems };
}

export async function getProductById(id: string) {
  const product = await productsRepository.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export type CreateProductPayload = {
  imsCode: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  subCategory?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  locationId: string;
  vendorId?: string;
  variations?: Array<{
    color: string;
    stockQuantity?: number;
    photos?: Array<{ photoUrl: string; isPrimary?: boolean }>;
    subVariants?: Array<string | { name: string }>;
  }>;
  discounts?: DiscountInput[];
};

export async function createProduct(
  payload: CreateProductPayload,
  auth: AuthContext,
  auditMeta?: { ip?: string; userAgent?: string },
) {
  const categoryIdentifier = payload.categoryId ?? payload.categoryName;
  let category;
  try {
    category = await resolveCategory(auth.tenantId, categoryIdentifier);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      throw new NotFoundError(err.message);
    }
    throw err;
  }
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  let resolvedDiscounts: ResolvedDiscount[] = [];
  try {
    resolvedDiscounts = await resolveDiscounts(
      auth.tenantId,
      payload.discounts,
    );
  } catch (err) {
    if (err instanceof ProductServiceError) {
      throw new NotFoundError(err.message);
    }
    throw err;
  }

  if (payload.vendorId) {
    const vendor = await productsRepository.findVendor(payload.vendorId);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }
  }

  try {
    return await createProductWithInventory(
      {
        imsCode: String(payload.imsCode).trim(),
        name: payload.name,
        categoryId: category.id,
        description: payload.description,
        subCategory: payload.subCategory,
        length: payload.length,
        breadth: payload.breadth,
        height: payload.height,
        weight: payload.weight,
        costPrice: payload.costPrice,
        mrp: payload.mrp,
        locationId: payload.locationId,
        vendorId: payload.vendorId,
        variations: payload.variations,
        resolvedDiscounts,
      },
      auth.userId,
      auth.tenantId,
      auditMeta,
    );
  } catch (err) {
    if (err instanceof ProductServiceError) {
      if (err.statusCode === 409) {
        throw new AppError(err.message, 409);
      }
      if (err.statusCode === 400) {
        throw new DomainError(400, err.message);
      }
      if (err.statusCode === 404) {
        throw new NotFoundError(err.message);
      }
      throw new AppError(err.message, err.statusCode);
    }
    throw err;
  }
}

export type UpdateProductPayload = {
  imsCode?: string;
  name?: string;
  categoryId?: string;
  description?: string | null;
  subCategory?: string | null;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  weight?: number | null;
  costPrice?: number;
  mrp?: number;
  vendorId?: string | null;
  locationId?: string;
  variations?: Array<{
    color: string;
    stockQuantity?: number;
    photos?: Array<{ photoUrl: string; isPrimary?: boolean }>;
    subVariants?: Array<string | { name: string }>;
  }>;
  discounts?: Array<{
    discountTypeId?: string;
    discountTypeName?: string;
    discountPercentage: number;
    startDate?: string | Date;
    endDate?: string | Date;
    isActive?: boolean;
  }>;
};

export async function updateProduct(
  auth: AuthContext,
  productId: string,
  payload: UpdateProductPayload,
  auditMeta?: { ip?: string; userAgent?: string },
) {
  const existingProduct = await productsRepository.findProduct(productId, {
    where: { id: productId, tenantId: auth.tenantId, deletedAt: null },
  });
  if (!existingProduct) {
    throw new NotFoundError("Product not found");
  }

  if (payload.categoryId !== undefined) {
    const category = await productsRepository.findCategoryByTenant(
      payload.categoryId,
      auth.tenantId,
    );
    if (!category) {
      throw new NotFoundError("Category not found");
    }
  }

  const updateData: Prisma.ProductUpdateInput = {};

  if (payload.imsCode !== undefined) {
    const trimmedImsCode = String(payload.imsCode).trim();
    if (trimmedImsCode !== existingProduct.imsCode) {
      const other = await productsRepository.findProductByImsCode(
        existingProduct.tenantId,
        trimmedImsCode,
      );
      if (other && other.id !== productId) {
        throw new AppError("Product with this IMS code already exists", 409);
      }
    }
    updateData.imsCode = trimmedImsCode;
  }
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.categoryId !== undefined) {
    updateData.category = { connect: { id: payload.categoryId } };
  }
  if (payload.description !== undefined)
    updateData.description = payload.description ?? null;
  if (payload.subCategory !== undefined) {
    updateData.subCategory =
      payload.subCategory && String(payload.subCategory).trim().length > 0
        ? String(payload.subCategory).trim()
        : null;
  }
  if (payload.length !== undefined) updateData.length = payload.length ?? null;
  if (payload.breadth !== undefined)
    updateData.breadth = payload.breadth ?? null;
  if (payload.height !== undefined) updateData.height = payload.height ?? null;
  if (payload.weight !== undefined) updateData.weight = payload.weight ?? null;
  if (payload.costPrice !== undefined) updateData.costPrice = payload.costPrice;
  if (payload.mrp !== undefined) updateData.mrp = payload.mrp;
  if (payload.vendorId !== undefined) {
    if (payload.vendorId) {
      const vendor = await productsRepository.findVendor(payload.vendorId);
      if (!vendor) {
        throw new NotFoundError("Vendor not found");
      }
      updateData.vendor = { connect: { id: payload.vendorId } };
    } else {
      updateData.vendor = { disconnect: true };
    }
  }
  if (payload.locationId !== undefined) {
    const location = await productsRepository.findLocation(
      payload.locationId,
      existingProduct.tenantId,
    );
    if (!location) {
      throw new DomainError(
        400,
        "Product update failed: the selected location is invalid, inactive, or does not belong to your tenant.",
      );
    }
    updateData.location = { connect: { id: location.id } };
  }

  await upsertVariations(productId, payload.variations);

  if (payload.discounts !== undefined) {
    await productsRepository.deleteProductDiscountsByProductId(productId);
    const allDiscountTypes = await productsRepository.findDiscountTypes(
      auth.tenantId,
    );
    const discountTypeList = allDiscountTypes.map((dt) => ({
      id: dt.id,
      name: dt.name,
    }));

    if (Array.isArray(payload.discounts) && payload.discounts.length > 0) {
      const resolvedDiscounts: Array<{
        discountTypeId: string;
        discountPercentage: number;
        startDate: Date | null;
        endDate: Date | null;
        isActive: boolean;
      }> = [];

      for (const discount of payload.discounts) {
        const identifier = discount.discountTypeId ?? discount.discountTypeName;
        const discountType = resolveDiscountTypeFromList(
          identifier ?? "",
          discountTypeList,
        );
        if (!discountType) {
          throw new NotFoundError("Discount type not found");
        }
        const startDate = discount.startDate
          ? discount.startDate instanceof Date
            ? discount.startDate
            : (parseDate(String(discount.startDate))?.toJSDate() ?? null)
          : null;
        const endDate = discount.endDate
          ? discount.endDate instanceof Date
            ? discount.endDate
            : (parseDate(String(discount.endDate))?.toJSDate() ?? null)
          : null;
        resolvedDiscounts.push({
          discountTypeId: discountType.id,
          discountPercentage: Number(discount.discountPercentage),
          startDate,
          endDate,
          isActive: discount.isActive !== undefined ? discount.isActive : true,
        });
      }
      updateData.discounts = {
        create: resolvedDiscounts.map((d) => ({
          discountTypeId: d.discountTypeId,
          discountPercentage: d.discountPercentage,
          startDate: d.startDate,
          endDate: d.endDate,
          isActive: d.isActive,
        })),
      };
    }
  }

  const updatedProduct = await productsRepository.updateProduct(
    productId,
    updateData,
  );

  try {
    await createAuditLog({
      user: { connect: { id: auth.userId } },
      tenant: { connect: { id: auth.tenantId } },
      action: AuditAction.UPDATE_PRODUCT,
      resource: AuditResource.PRODUCT,
      resourceId: updatedProduct.id,
      details: { imsCode: updatedProduct.imsCode, name: updatedProduct.name },
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
    });
  } catch {
    // Non-fatal: audit log failure should not fail the request
  }

  return updatedProduct;
}

export async function deleteProduct(id: string) {
  const product = await productsRepository.findProductById(id);
  if (!product) throw new NotFoundError("Product not found");
  await productsRepository.softDeleteProduct(id);
}

export type GetAllCategoriesParams = {
  tenantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export async function getAllCategories(params: GetAllCategoriesParams) {
  const allowedSortFields = ["id", "name", "createdAt", "updatedAt"];
  const orderBy = getPrismaOrderBy(
    params.sortBy,
    params.sortOrder,
    allowedSortFields,
  ) ?? {
    name: "asc" as const,
  };
  const skip = (params.page - 1) * params.limit;

  const [totalItems, categories] = await Promise.all([
    productsRepository.countCategories(params.tenantId),
    prisma.category.findMany({
      where: { tenantId: params.tenantId },
      select: { id: true, name: true, description: true },
      orderBy: orderBy as {
        name?: "asc" | "desc";
        id?: "asc" | "desc";
        createdAt?: "asc" | "desc";
        updatedAt?: "asc" | "desc";
      },
      skip,
      take: params.limit,
    }),
  ]);

  return { categories, totalItems };
}

export type GetAllDiscountTypesParams = {
  tenantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export async function getAllDiscountTypes(params: GetAllDiscountTypesParams) {
  const allowedSortFields = ["id", "name", "createdAt", "updatedAt"];
  const orderBy = getPrismaOrderBy(
    params.sortBy,
    params.sortOrder,
    allowedSortFields,
  ) ?? {
    name: "asc" as const,
  };
  const skip = (params.page - 1) * params.limit;
  const where = { tenantId: params.tenantId };

  const [totalItems, discountTypes] = await Promise.all([
    prisma.discountType.count({ where }),
    prisma.discountType.findMany({
      where,
      select: { id: true, name: true, description: true },
      orderBy: orderBy as {
        name?: "asc" | "desc";
        id?: "asc" | "desc";
        createdAt?: "asc" | "desc";
        updatedAt?: "asc" | "desc";
      },
      skip,
      take: params.limit,
    }),
  ]);

  return { discountTypes, totalItems };
}

export async function getProductDiscounts(tenantId: string, productId: string) {
  const product = await productsRepository.findProductById(productId);
  if (!product || product.tenantId !== tenantId)
    throw new NotFoundError("Product not found");

  const now = new Date();
  const discounts = await productsRepository.findProductDiscounts({
    where: {
      productId,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    orderBy: [
      { discountType: { name: "asc" as const } },
      { value: "desc" as const },
    ],
    include: { discountType: { select: { id: true, name: true } } },
  });

  return discounts.map((d) => ({
    id: d.id,
    name: d.discountType.name,
    value: Number(d.value),
    valueType: d.valueType,
    discountType: d.discountType.name,
    discountTypeId: d.discountType.id,
    startDate: d.startDate,
    endDate: d.endDate,
  }));
}

export type GetAllProductDiscountsParams = {
  tenantId: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  productId?: string;
  categoryId?: string;
  subCategoryId?: string;
  discountTypeId?: string;
};

export async function getAllProductDiscounts(
  params: GetAllProductDiscountsParams,
) {
  const productWhere: Prisma.ProductWhereInput = {
    tenantId: params.tenantId,
    deletedAt: null,
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.subCategoryId && { subCategoryId: params.subCategoryId }),
  };
  const where: Prisma.ProductDiscountWhereInput = { product: productWhere };
  if (params.productId) where.productId = params.productId;
  if (params.discountTypeId) where.discountTypeId = params.discountTypeId;

  if (params.search) {
    where.OR = [
      { product: { name: { contains: params.search, mode: "insensitive" } } },
      {
        product: { imsCode: { contains: params.search, mode: "insensitive" } },
      },
      {
        discountType: {
          name: { contains: params.search, mode: "insensitive" },
        },
      },
    ];
  }

  const allowedSortFields = [
    "id",
    "value",
    "valueType",
    "isActive",
    "startDate",
    "endDate",
    "createdAt",
  ];
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = (params.sortOrder as "asc" | "desc") ?? "desc";
  let orderBy: Prisma.ProductDiscountOrderByWithRelationInput | undefined =
    getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) as
      | Prisma.ProductDiscountOrderByWithRelationInput
      | undefined;
  if (!orderBy && sortBy.toLowerCase() === "productname") {
    orderBy = { product: { name: sortOrder } };
  }
  if (!orderBy && sortBy.toLowerCase() === "discounttypename") {
    orderBy = { discountType: { name: sortOrder } };
  }
  if (!orderBy) orderBy = { createdAt: "desc" };

  const skip = (params.page - 1) * params.limit;
  const include = {
    product: {
      select: {
        id: true,
        name: true,
        imsCode: true,
        categoryId: true,
        subCategory: true,
        subCategoryId: true,
        category: { select: { id: true, name: true } },
      },
    },
    discountType: { select: { id: true, name: true } },
  } as const;

  const [totalItems, discounts] = await Promise.all([
    productsRepository.countProductDiscounts(where),
    productsRepository.findProductDiscounts({
      where,
      orderBy,
      skip,
      take: params.limit,
      include,
    }),
  ]);

  return { discounts, totalItems };
}

export async function getProductsForExport(
  tenantId: string,
  productIds?: string[],
) {
  const products = await productsRepository.findProductsForExport(
    tenantId,
    productIds,
  );
  if (products.length === 0) {
    throw new NotFoundError("No products found to export");
  }
  return products;
}
