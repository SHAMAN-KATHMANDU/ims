import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { parseDate } from "@repo/shared";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";
import {
  excelProductRowSchema,
  type ExcelProductRow,
  type ValidationError,
} from "./bulkUpload.validation";
import { logger } from "@/config/logger";
import { env } from "@/config/env";
import { sendControllerError } from "@/utils/controllerError";

class ProductController {
  // Create product (admin and superAdmin only). Requires a valid warehouse/location before create (see location resolution below).
  async createProduct(req: Request, res: Response) {
    try {
      const {
        imsCode,
        name,
        categoryId,
        description,
        subCategory,
        length,
        breadth,
        height,
        weight,
        costPrice,
        mrp,
        variations, //Array of color variations
        discounts, //Array of discounts
      } = req.body;

      // Validate required fields
      if (!imsCode) {
        return res.status(400).json({ message: "IMS code is required" });
      }
      if (!name) {
        return res.status(400).json({ message: "Product name is required" });
      }
      if (!categoryId && !req.body.categoryName) {
        return res.status(400).json({
          message: "Category ID or Category Name is required",
          hint: "You can use either 'categoryId' (UUID) or 'categoryName' (string)",
        });
      }

      // Support both categoryId and categoryName
      const categoryIdentifier = categoryId || req.body.categoryName;
      if (costPrice === undefined || costPrice === null) {
        return res.status(400).json({ message: "Cost price is required" });
      }
      if (mrp === undefined || mrp === null) {
        return res.status(400).json({ message: "MRP is required" });
      }

      // Validate that user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const tenantId = req.user!.tenantId;
      // Get all categories and discount types for lookup (tenant-scoped)
      const allCategories = await prisma.category.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
      const allDiscountTypes = await prisma.discountType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });

      // Support both categoryId (UUID) and categoryName (string) lookup
      let category;
      if (categoryIdentifier) {
        // Try UUID first
        category = await prisma.category.findUnique({
          where: { id: categoryIdentifier },
        });

        // If not found by UUID, try by name
        if (!category) {
          category = await prisma.category.findFirst({
            where: { name: categoryIdentifier },
          });
        }
      }

      if (!category) {
        return res.status(404).json({
          message: "Category not found",
          providedCategoryId: categoryIdentifier,
          hint: "You can use either category UUID or category name",
          availableCategories: allCategories.map(
            (c: { id: string; name: string }) => ({ id: c.id, name: c.name }),
          ),
        });
      }

      // Validate and resolve discount types if discounts are provided
      const resolvedDiscounts = [];
      if (discounts && Array.isArray(discounts)) {
        for (const discount of discounts) {
          let discountType = null;

          // Try by ID first (tenant-scoped)
          if (discount.discountTypeId) {
            discountType = await prisma.discountType.findFirst({
              where: { id: discount.discountTypeId, tenantId },
            });
          }

          // If not found by ID, try by name
          if (!discountType && discount.discountTypeName) {
            discountType = await prisma.discountType.findFirst({
              where: { name: discount.discountTypeName, tenantId },
            });
          }

          // If still not found, try using discountTypeId as name (for convenience)
          if (
            !discountType &&
            discount.discountTypeId &&
            !discount.discountTypeId.match(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            )
          ) {
            discountType = await prisma.discountType.findFirst({
              where: { name: discount.discountTypeId, tenantId },
            });
          }

          if (!discountType) {
            return res.status(404).json({
              message: "Discount type not found",
              providedDiscountTypeId: discount.discountTypeId,
              providedDiscountTypeName: discount.discountTypeName,
              hint: "You can use either discountTypeId (UUID) or discountTypeName (string like 'Normal', 'Member', etc.)",
              availableDiscountTypes: allDiscountTypes.map(
                (dt: { id: string; name: string }) => ({
                  id: dt.id,
                  name: dt.name,
                }),
              ),
            });
          }

          // parseDate utility
          const startDate = discount.startDate
            ? parseDate(discount.startDate)?.toJSDate() || null
            : null;
          const endDate = discount.endDate
            ? parseDate(discount.endDate)?.toJSDate() || null
            : null;

          resolvedDiscounts.push({
            discountTypeId: discountType.id,
            discountPercentage: parseFloat(
              discount.discountPercentage.toString(),
            ),
            startDate: startDate,
            endDate: endDate,
            isActive:
              discount.isActive !== undefined ? discount.isActive : true,
          });
        }
      }

      // Handle vendorId if provided
      const vendorId = req.body.vendorId as string | undefined;
      if (vendorId) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorId },
        });
        if (!vendor) {
          return res.status(404).json({
            message: "Vendor not found",
            providedVendorId: vendorId,
          });
        }
      }

      const trimmedImsCode = (imsCode as string).trim();

      // Explicit duplicate check (tenant-scoped) so we return a clear message and treat trimmed codes as same
      const existingByImsCode = await prisma.product.findFirst({
        where: { tenantId, imsCode: trimmedImsCode },
      });
      if (existingByImsCode) {
        return res.status(409).json({
          message: "Product with this IMS code already exists",
        });
      }

      // --- Resolve target warehouse BEFORE creating product (data integrity: every product must be linked to a valid location) ---
      const defaultLocationId = req.body.defaultLocationId as
        | string
        | undefined;
      let warehouseLocation: { id: string } | null = null;

      if (defaultLocationId) {
        // Explicit location: must belong to tenant and be active (prefer warehouse)
        const loc = await prisma.location.findFirst({
          where: {
            id: defaultLocationId,
            tenantId,
            isActive: true,
          },
          select: { id: true, type: true },
        });
        if (!loc) {
          return res.status(400).json({
            message:
              "Product creation failed: the selected location is invalid or does not belong to your tenant.",
          });
        }
        warehouseLocation = { id: loc.id };
      }

      if (!warehouseLocation) {
        // No explicit location: require tenant's default warehouse (business rule: at least one default warehouse per tenant)
        const defaultWarehouse = await prisma.location.findFirst({
          where: {
            tenantId,
            type: "WAREHOUSE",
            isDefaultWarehouse: true,
            isActive: true,
          },
          select: { id: true },
        });
        if (!defaultWarehouse) {
          return res.status(400).json({
            message:
              "Product creation failed: tenant has no default warehouse configured. Please set a default warehouse in Locations.",
          });
        }
        warehouseLocation = defaultWarehouse;
      }

      // Create product (we have a valid warehouseLocation; will link variations to it after create)
      const product = await prisma.product.create({
        data: {
          tenantId,
          imsCode: trimmedImsCode,
          name: name as string,
          categoryId: category.id,
          description: description || null,
          subCategory: subCategory?.trim() || null,
          length: length ? parseFloat(length.toString()) : null,
          breadth: breadth ? parseFloat(breadth.toString()) : null,
          height: height ? parseFloat(height.toString()) : null,
          weight: weight ? parseFloat(weight.toString()) : null,
          costPrice: parseFloat(costPrice.toString()),
          mrp: parseFloat(mrp.toString()),
          vendorId: vendorId || null,
          createdById: req.user!.id,
          // Add variations (colors with photos)
          variations:
            variations && Array.isArray(variations)
              ? {
                  create: variations.map((variation: any) => ({
                    color: variation.color,
                    stockQuantity: variation.stockQuantity || 0,
                    photos:
                      variation.photos && Array.isArray(variation.photos)
                        ? {
                            create: variation.photos.map((photo: any) => ({
                              photoUrl: photo.photoUrl,
                              isPrimary: photo.isPrimary || false,
                            })),
                          }
                        : undefined,
                    subVariations:
                      variation.subVariants &&
                      Array.isArray(variation.subVariants)
                        ? {
                            create: variation.subVariants
                              .map((n: string) =>
                                typeof n === "string"
                                  ? n.trim()
                                  : ((n as any)?.name?.trim() ?? ""),
                              )
                              .filter(Boolean)
                              .map((name: string) => ({ name })),
                          }
                        : undefined,
                  })),
                }
              : undefined,
          // Add discounts (use resolved discounts with actual UUIDs)
          discounts:
            resolvedDiscounts.length > 0
              ? {
                  create: resolvedDiscounts.map((discount: any) => ({
                    discountTypeId: discount.discountTypeId,
                    discountPercentage: parseFloat(
                      discount.discountPercentage.toString(),
                    ),
                    startDate: discount.startDate
                      ? parseDate(discount.startDate)?.toJSDate() || null
                      : null,
                    endDate: discount.endDate
                      ? parseDate(discount.endDate)?.toJSDate() || null
                      : null,
                    isActive:
                      discount.isActive !== undefined
                        ? discount.isActive
                        : true,
                  })),
                }
              : undefined,
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          variations: {
            include: {
              photos: true,
              subVariations: true,
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      // Link product to location (warehouseLocation already resolved and validated above)
      try {
        if (warehouseLocation && product.variations?.length) {
          for (const v of product.variations) {
            const hasSubVariants =
              Array.isArray((v as any).subVariations) &&
              (v as any).subVariations.length > 0;
            if (hasSubVariants) continue; // stock is per location per sub-variant via inventory API
            const qty = Math.max(0, Number(v.stockQuantity) || 0);
            // Use findFirst + create/update because Prisma upsert with compound unique + null is unreliable
            const existing = await prisma.locationInventory.findFirst({
              where: {
                locationId: warehouseLocation!.id,
                variationId: v.id,
                subVariationId: null,
              },
            });
            if (existing) {
              await prisma.locationInventory.update({
                where: { id: existing.id },
                data: { quantity: { increment: qty } },
              });
            } else {
              await prisma.locationInventory.create({
                data: {
                  locationId: warehouseLocation!.id,
                  variationId: v.id,
                  subVariationId: null,
                  quantity: qty,
                },
              });
            }
          }
        }

        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            action: "CREATE_PRODUCT",
            resource: "product",
            resourceId: product.id,
            details: {
              imsCode: product.imsCode,
              name: product.name,
            },
            ip:
              (req as any).ip ??
              (req.socket as any)?.remoteAddress ??
              undefined,
            userAgent: req.get("user-agent") ?? undefined,
          },
        });
      } catch (postCreateErr) {
        logger.error(
          "Post-create step failed (inventory link or audit log)",
          req.requestId,
          postCreateErr,
        );
        // Still return 201 so the UI shows success; product was created
      }

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error: unknown) {
      const e = error as { code?: string; meta?: { target?: string[] } };
      if (e.code === "P2002") {
        const target = e.meta?.target as string[] | undefined;
        const isImsConflict =
          !target ||
          (target.length === 2 &&
            target.some((f) => f === "imsCode" || f === "ims_code") &&
            target.some((f) => f === "tenantId" || f === "tenant_id"));
        return res.status(409).json({
          message: isImsConflict
            ? "Product with this IMS code already exists"
            : "A duplicate value was provided (e.g. duplicate variation color).",
        });
      }
      return sendControllerError(req, res, error, "Create product error");
    }
  }

  // Get all products (all authenticated users can view)
  async getAllProducts(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse optional filters
      const locationId = req.query.locationId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const subCategoryId = req.query.subCategoryId as string | undefined;
      const subCategory = req.query.subCategory as string | undefined;
      const vendorId = req.query.vendorId as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const lowStock =
        req.query.lowStock === "1" || req.query.lowStock === "true";

      // Allowed fields for sorting (date added = dateCreated); sorting at DB level
      const allowedSortFields = [
        "dateCreated", // date added
        "dateModified",
        "name",
        "imsCode",
        "costPrice",
        "mrp",
        "vendorId",
        "id",
      ];

      // Get orderBy for Prisma (sortOrder: asc | desc). Relation sort for vendor name.
      let orderBy: any = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields);
      if (!orderBy && sortBy?.toLowerCase() === "vendorname") {
        orderBy = { vendor: { name: sortOrder } };
      }
      if (!orderBy) {
        orderBy = { dateCreated: "desc" };
      }

      // Build search filter
      const where: any = {};
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

      // Add category filter
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Add subcategory filter (by ID or by denormalized name)
      if (subCategoryId) {
        where.subCategoryId = subCategoryId;
      }
      if (subCategory && !subCategoryId) {
        where.subCategory = { equals: subCategory, mode: "insensitive" };
      }

      // Add vendor filter
      if (vendorId) {
        where.vendorId = vendorId;
      }

      // Add date range filter (on dateCreated)
      if (dateFrom || dateTo) {
        where.dateCreated = {};
        if (dateFrom) {
          const from = new Date(dateFrom);
          where.dateCreated.gte = from;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          where.dateCreated.lte = to;
        }
      }

      // Low stock: by variant total (sum across all locations), not per location
      const LOW_STOCK_THRESHOLD = 5;
      let lowStockVariationIds: string[] = [];
      if (lowStock) {
        const byVariant = await prisma.locationInventory.groupBy({
          by: ["variationId"],
          _sum: { quantity: true },
        });
        // Any variant with total < threshold makes the product low stock (including 0)
        lowStockVariationIds = byVariant
          .filter((r) => Number(r._sum?.quantity ?? 0) < LOW_STOCK_THRESHOLD)
          .map((r) => r.variationId);
      }

      if (locationId || lowStock) {
        if (locationId && lowStock && lowStockVariationIds.length > 0) {
          // At this location and variant total is low
          where.variations = {
            some: {
              id: { in: lowStockVariationIds },
              locationInventory: {
                some: { locationId: locationId, quantity: { gt: 0 } },
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

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build include object: always include locationInventory so UI can show stock per showroom
      const variationsInclude: any = {
        photos: true,
        subVariations: { select: { id: true, name: true } },
        locationInventory: {
          select: {
            quantity: true,
            subVariationId: true,
            subVariation: { select: { id: true, name: true } },
            location: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      };

      // Get total count and products in parallel
      const [totalItems, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: {
            category: true,
            vendor: {
              select: { id: true, name: true },
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
            variations: {
              include: variationsInclude,
            },
            discounts: {
              include: {
                discountType: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const result = createPaginationResult(products, totalItems, page, limit);

      res.status(200).json({
        message: "Products fetched successfully",
        locationId: locationId || null,
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all products error");
    }
  }

  // Get product by ID (all authenticated users can view)
  async getProductById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          variations: {
            include: {
              photos: true,
              subVariations: { select: { id: true, name: true } },
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json({
        message: "Product fetched successfully",
        product,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get product by ID error");
    }
  }

  // Update product (admin and superAdmin only)
  async updateProduct(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const {
        imsCode,
        name,
        categoryId,
        description,
        subCategory,
        length,
        breadth,
        height,
        weight,
        costPrice,
        mrp,
        vendorId,
        variations,
        discounts,
      } = req.body;

      logger.log(`[UpdateProduct] Attempting to update product with ID: ${id}`);

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        logger.log(
          `[UpdateProduct] Product with ID ${id} not found in database`,
        );
        return res.status(404).json({
          message: "Product not found",
          productId: id,
        });
      }

      logger.log(
        `[UpdateProduct] Product found: ${existingProduct.name} (${existingProduct.imsCode})`,
      );

      // If categoryId is being updated, validate it exists
      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (imsCode !== undefined) {
        const trimmedImsCode = String(imsCode).trim();
        if (trimmedImsCode !== existingProduct.imsCode) {
          const otherWithSameImsCode = await prisma.product.findFirst({
            where: {
              tenantId: existingProduct.tenantId,
              imsCode: trimmedImsCode,
              id: { not: id },
            },
          });
          if (otherWithSameImsCode) {
            return res.status(409).json({
              message: "Product with this IMS code already exists",
            });
          }
        }
        updateData.imsCode = trimmedImsCode;
      }
      if (name !== undefined) {
        updateData.name = name;
      }
      if (categoryId !== undefined) {
        updateData.categoryId = categoryId;
      }
      if (description !== undefined) {
        updateData.description = description || null;
      }
      if (subCategory !== undefined) {
        updateData.subCategory =
          subCategory && subCategory.trim().length > 0
            ? subCategory.trim()
            : null;
      }
      if (length !== undefined) {
        updateData.length = length ? parseFloat(length) : null;
      }
      if (breadth !== undefined) {
        updateData.breadth = breadth ? parseFloat(breadth) : null;
      }
      if (height !== undefined) {
        updateData.height = height ? parseFloat(height) : null;
      }
      if (weight !== undefined) {
        updateData.weight = weight ? parseFloat(weight) : null;
      }
      if (costPrice !== undefined) {
        updateData.costPrice = parseFloat(costPrice);
      }
      if (mrp !== undefined) {
        updateData.mrp = parseFloat(mrp);
      }
      if (vendorId !== undefined) {
        if (vendorId) {
          const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
          });
          if (!vendor) {
            return res.status(404).json({
              message: "Vendor not found",
              providedVendorId: vendorId,
            });
          }
        }
        updateData.vendorId = vendorId || null;
      }

      // Handle variations update if provided (upsert by color; do not delete variations referenced by sales/transfers)
      if (variations !== undefined) {
        const existingVariations = await prisma.productVariation.findMany({
          where: { productId: id },
          include: {
            subVariations: true,
            _count: {
              select: { saleItems: true, transferItems: true },
            },
          },
        });
        const incomingColors = new Set(
          Array.isArray(variations)
            ? variations.map((v: any) => (v.color || "").trim()).filter(Boolean)
            : [],
        );

        for (const existing of existingVariations) {
          const hasDependents =
            (existing._count?.saleItems ?? 0) > 0 ||
            (existing._count?.transferItems ?? 0) > 0;
          if (incomingColors.has(existing.color)) {
            const payload = variations.find(
              (v: any) => (v.color || "").trim() === existing.color,
            );
            if (payload) {
              const newPhotos =
                payload.photos && Array.isArray(payload.photos)
                  ? payload.photos.map((photo: any) => ({
                      photoUrl: photo.photoUrl,
                      isPrimary: photo.isPrimary || false,
                    }))
                  : [];
              if (newPhotos.length > 0) {
                await prisma.variationPhoto.deleteMany({
                  where: { variationId: existing.id },
                });
              }
              const incomingSubArr =
                payload.subVariants && Array.isArray(payload.subVariants)
                  ? payload.subVariants
                      .map((s: string | { name: string }) =>
                        typeof s === "string"
                          ? s.trim()
                          : (s?.name ?? "").trim(),
                      )
                      .filter((x: unknown): x is string => Boolean(x))
                  : [];
              const incomingSubNames = new Set<string>(incomingSubArr);
              const existingSubs = existing.subVariations ?? [];
              for (const sub of existingSubs) {
                if (!incomingSubNames.has(sub.name)) {
                  const subDependents =
                    (await prisma.locationInventory.count({
                      where: { subVariationId: sub.id },
                    })) +
                    (await prisma.saleItem.count({
                      where: { subVariationId: sub.id },
                    })) +
                    (await prisma.transferItem.count({
                      where: { subVariationId: sub.id },
                    }));
                  if (subDependents === 0) {
                    await prisma.productSubVariation.delete({
                      where: { id: sub.id },
                    });
                  }
                }
              }
              for (const name of incomingSubNames) {
                const exists = existingSubs.some((s) => s.name === name);
                if (!exists) {
                  await prisma.productSubVariation.create({
                    data: { variationId: existing.id, name },
                  });
                }
              }
              await prisma.productVariation.update({
                where: { id: existing.id },
                data: {
                  stockQuantity:
                    payload.stockQuantity ?? existing.stockQuantity,
                  ...(newPhotos.length > 0
                    ? {
                        photos: { create: newPhotos },
                      }
                    : {}),
                },
              });
            }
          } else if (!hasDependents) {
            await prisma.productVariation.delete({
              where: { id: existing.id },
            });
          }
        }

        for (const variation of Array.isArray(variations) ? variations : []) {
          const color = (variation.color || "").trim();
          if (!color || existingVariations.some((e) => e.color === color))
            continue;
          await prisma.productVariation.create({
            data: {
              productId: id,
              color,
              stockQuantity: variation.stockQuantity || 0,
              photos:
                variation.photos && Array.isArray(variation.photos)
                  ? {
                      create: variation.photos.map((photo: any) => ({
                        photoUrl: photo.photoUrl,
                        isPrimary: photo.isPrimary || false,
                      })),
                    }
                  : undefined,
              subVariations:
                variation.subVariants && Array.isArray(variation.subVariants)
                  ? {
                      create: variation.subVariants
                        .map((n: string | { name: string }) =>
                          typeof n === "string"
                            ? n.trim()
                            : (n?.name ?? "").trim(),
                        )
                        .filter(Boolean)
                        .map((name: string) => ({ name })),
                    }
                  : undefined,
            },
          });
        }
      }

      // Handle discounts update if provided
      if (discounts !== undefined) {
        const tenantId = req.user!.tenantId;
        // Get all discount types for lookup (tenant-scoped)
        const allDiscountTypes = await prisma.discountType.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        });

        // Delete existing discounts and create new ones
        await prisma.productDiscount.deleteMany({
          where: { productId: id },
        });

        if (Array.isArray(discounts) && discounts.length > 0) {
          const resolvedDiscounts = [];

          for (const discount of discounts) {
            // Try to find discount type by ID or name (tenant-scoped)
            const identifier =
              discount.discountTypeId || discount.discountTypeName;

            const discountType = await prisma.discountType.findFirst({
              where: {
                tenantId,
                OR: [{ id: identifier }, { name: identifier }],
              },
            });

            if (!discountType) {
              return res.status(404).json({
                message: "Discount type not found",
                providedDiscountTypeId: discount.discountTypeId,
                providedDiscountTypeName: discount.discountTypeName,
                hint: "You can use either discountTypeId (UUID) or discountTypeName (string like 'Normal', 'Member', etc.)",
                availableDiscountTypes: allDiscountTypes.map(
                  (dt: { id: string; name: string }) => ({
                    id: dt.id,
                    name: dt.name,
                  }),
                ),
              });
            }

            // Handle date parsing using parseDate utility
            const startDate = discount.startDate
              ? parseDate(discount.startDate)?.toJSDate() || null
              : null;
            const endDate = discount.endDate
              ? parseDate(discount.endDate)?.toJSDate() || null
              : null;

            resolvedDiscounts.push({
              discountTypeId: discountType.id,
              discountPercentage: parseFloat(
                discount.discountPercentage.toString(),
              ),
              startDate: startDate,
              endDate: endDate,
              isActive:
                discount.isActive !== undefined ? discount.isActive : true,
            });
          }

          if (resolvedDiscounts.length > 0) {
            updateData.discounts = {
              create: resolvedDiscounts,
            };
          }
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          variations: {
            include: {
              photos: true,
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      // Audit log: UPDATE_PRODUCT
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            action: "UPDATE_PRODUCT",
            resource: "product",
            resourceId: updatedProduct.id,
            details: {
              imsCode: updatedProduct.imsCode,
              name: updatedProduct.name,
            },
            ip:
              (req as any).ip ??
              (req.socket as any)?.remoteAddress ??
              undefined,
            userAgent: req.get("user-agent") ?? undefined,
          },
        });
      } catch (auditErr) {
        logger.error(
          "Audit log UPDATE_PRODUCT failed",
          req.requestId,
          auditErr,
        );
      }

      res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error: unknown) {
      const e = error as { code?: string; meta?: { target?: string[] } };
      if (e.code === "P2002") {
        const target = e.meta?.target as string[] | undefined;
        const isImsConflict =
          !target ||
          (target.length === 2 &&
            target.some((f) => f === "imsCode" || f === "ims_code") &&
            target.some((f) => f === "tenantId" || f === "tenant_id"));
        return res.status(409).json({
          message: isImsConflict
            ? "Product with this IMS code already exists"
            : "A duplicate value was provided (e.g. duplicate variation color).",
        });
      }
      return sendControllerError(req, res, error, "Update product error");
    }
  }

  // Delete product (admin and superAdmin only)
  async deleteProduct(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      await prisma.product.delete({
        where: { id },
      });

      res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete product error");
    }
  }

  // Get all categories (helper endpoint for dropdown/selection)
  async getAllCategories(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);

      // Allowed fields for sorting
      const allowedSortFields = ["id", "name", "createdAt", "updatedAt"];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        name: "asc",
      };

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and categories in parallel
      const [totalItems, categories] = await Promise.all([
        prisma.category.count(),
        prisma.category.findMany({
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const result = createPaginationResult(
        categories,
        totalItems,
        page,
        limit,
      );

      res.status(200).json({
        message: "Categories fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get categories error");
    }
  }

  // Get all discount types for current tenant (helper endpoint for dropdown/selection)
  async getAllDiscountTypes(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);

      const allowedSortFields = ["id", "name", "createdAt", "updatedAt"];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        name: "asc",
      };

      const skip = (page - 1) * limit;
      const where = { tenantId };

      const [totalItems, discountTypes] = await Promise.all([
        prisma.discountType.count({ where }),
        prisma.discountType.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const result = createPaginationResult(
        discountTypes,
        totalItems,
        page,
        limit,
      );

      res.status(200).json({
        message: "Discount types fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get discount types error");
    }
  }

  // Get all product discounts with filters, sort, search (for discounts page)
  async getAllProductDiscounts(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );
      const productId = req.query.productId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const subCategoryId = req.query.subCategoryId as string | undefined;
      const discountTypeId = req.query.discountTypeId as string | undefined;

      const where: any = {};
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
          { product: { imsCode: { contains: search, mode: "insensitive" } } },
          {
            discountType: {
              name: { contains: search, mode: "insensitive" },
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
      let orderBy: any = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields);
      if (!orderBy && sortBy?.toLowerCase() === "productname") {
        orderBy = { product: { name: sortOrder } };
      }
      if (!orderBy && sortBy?.toLowerCase() === "discounttypename") {
        orderBy = { discountType: { name: sortOrder } };
      }
      if (!orderBy) {
        orderBy = { createdAt: "desc" };
      }

      const skip = (page - 1) * limit;
      const [totalItems, discounts] = await Promise.all([
        prisma.productDiscount.count({ where }),
        prisma.productDiscount.findMany({
          where,
          skip,
          take: limit,
          include: {
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
          },
          orderBy,
        }),
      ]);

      const result = createPaginationResult(discounts, totalItems, page, limit);
      res.status(200).json({
        message: "Product discounts fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get all product discounts error",
      );
    }
  }

  // Get active discounts for a product
  async getProductDiscounts(req: Request, res: Response) {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, name: true },
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get active discounts for the product
      const now = new Date();
      const discounts = await prisma.productDiscount.findMany({
        where: {
          productId: id,
          isActive: true,
          OR: [{ startDate: null }, { startDate: { lte: now } }],
          AND: [
            {
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          ],
        },
        include: {
          discountType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            discountType: {
              name: "asc",
            },
          },
          {
            value: "desc",
          },
        ],
      });

      // Format the response (discount includes discountType from Prisma include)
      type DiscountWithType = (typeof discounts)[number];
      const formattedDiscounts = discounts.map(
        (discount: DiscountWithType) => ({
          id: discount.id,
          name: (
            discount as DiscountWithType & {
              discountType: { id: string; name: string };
            }
          ).discountType.name,
          value: Number(discount.value),
          valueType: discount.valueType,
          discountType: (
            discount as DiscountWithType & {
              discountType: { id: string; name: string };
            }
          ).discountType.name,
          discountTypeId: (
            discount as DiscountWithType & {
              discountType: { id: string; name: string };
            }
          ).discountType.id,
          startDate: discount.startDate,
          endDate: discount.endDate,
        }),
      );

      res.status(200).json({
        message: "Product discounts fetched successfully",
        discounts: formattedDiscounts,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get product discounts error",
      );
    }
  }

  // Bulk upload products from Excel or CSV file
  async bulkUploadProducts(req: Request, res: Response) {
    const errors: ValidationError[] = [];
    const createdProducts: any[] = [];
    const skippedProducts: any[] = [];

    try {
      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          errors: [],
        });
      }

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const isCSV = fileExt === ".csv";

      // Helper function to normalize header names
      const normalizeHeader = (header: string): string => {
        return header
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "") // Remove special characters for matching
          .replace(/\s+/g, ""); // Remove spaces
      };

      // Map of expected headers to their normalized forms
      const headerMappings: Record<string, string[]> = {
        imsCode: ["imscode", "ims_code", "ims"],
        category: ["category"],
        subCategory: ["subcategory", "sub-category", "sub_category"],
        name: ["nameofproduct", "name", "productname", "product_name"],
        variation: [
          "variations",
          "variation",
          "designs",
          "colors",
          "variationsdesignscolors",
        ],
        material: ["material"],
        length: ["length"],
        breadth: ["breadth", "bredth", "width"],
        height: ["height"],
        weight: ["weight"],
        vendor: ["vendor"],
        quantity: ["qty", "quantity"],
        costPrice: ["costprice", "cost_price", "cost"],
        finalSP: ["finalsp", "final_sp", "sellingprice", "mrp", "price"],
        nonMemberDiscount: [
          "nonmemberdiscount",
          "non_member_discount",
          "nonmember",
        ],
        memberDiscount: ["memberdiscount", "member_discount", "member"],
        wholesaleDiscount: [
          "wholesalediscount",
          "wholesale_discount",
          "wholesale",
        ],
      };

      let rows: ExcelProductRow[] = [];
      let columnMap: Record<string, string> = {}; // For CSV: maps fieldName to CSV column name

      if (isCSV) {
        // Parse CSV file
        const csvRows: Record<string, any>[] = [];
        const csvColumnMap: Record<string, string> = {};

        await new Promise<void>((resolve, reject) => {
          const stream = fs
            .createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row: Record<string, any>) => {
              csvRows.push(row);
            })
            .on("end", () => {
              resolve();
            })
            .on("error", (error) => {
              reject(error);
            });
        });

        if (csvRows.length === 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "CSV file is empty or invalid",
            errors: [],
          });
        }

        // Get header row (first row keys)
        const csvHeaders = Object.keys(csvRows[0] || {});

        // Build column map from CSV headers
        for (const csvHeader of csvHeaders) {
          const normalized = normalizeHeader(csvHeader);
          let bestMatch: { fieldName: string; priority: number } | null = null;

          for (const [fieldName, variations] of Object.entries(
            headerMappings,
          )) {
            // Skip if already mapped
            if (csvColumnMap[fieldName]) continue;

            // Check for exact match (highest priority)
            if (variations.some((v) => normalized === v)) {
              bestMatch = { fieldName, priority: 2 };
              break;
            }

            // Check for contains match (lower priority)
            if (
              !bestMatch &&
              variations.some(
                (v) => normalized.includes(v) || v.includes(normalized),
              )
            ) {
              bestMatch = { fieldName, priority: 1 };
            }
          }

          if (bestMatch) {
            csvColumnMap[bestMatch.fieldName] = csvHeader;
          }
        }

        columnMap = csvColumnMap;

        // Validate that required columns are found
        const requiredColumns = [
          "imsCode",
          "category",
          "name",
          "variation",
          "costPrice",
          "finalSP",
        ];
        const missingColumns = requiredColumns.filter(
          (col) => !csvColumnMap[col],
        );

        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in CSV file",
            missingColumns,
            foundColumns: Object.keys(csvColumnMap),
            hint: "Please ensure your CSV file has headers: IMS CODE, Category, Name of Product, Variations(Designs/Colors), Cost Price, Final SP",
          });
        }

        // Convert CSV rows to ExcelProductRow format
        csvRows.forEach((csvRow, rowIndex) => {
          const getCellValue = (fieldName: string) => {
            const csvColumnName = csvColumnMap[fieldName];
            if (!csvColumnName) return undefined;
            const value = csvRow[csvColumnName];
            // Convert empty strings to undefined
            return value === "" || value === null ? undefined : value;
          };

          const rowData = {
            imsCode: getCellValue("imsCode"),
            category: getCellValue("category"),
            subCategory: getCellValue("subCategory"),
            name: getCellValue("name"),
            variation: getCellValue("variation"),
            material: getCellValue("material"),
            length: getCellValue("length"),
            breadth: getCellValue("breadth"),
            height: getCellValue("height"),
            weight: getCellValue("weight"),
            vendor: getCellValue("vendor"),
            quantity: getCellValue("quantity"),
            costPrice: getCellValue("costPrice"),
            finalSP: getCellValue("finalSP"),
            nonMemberDiscount: getCellValue("nonMemberDiscount"),
            memberDiscount: getCellValue("memberDiscount"),
            wholesaleDiscount: getCellValue("wholesaleDiscount"),
          };

          // Check if row is empty
          const hasData = Object.values(rowData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== "",
          );
          if (!hasData) {
            return; // Skip empty rows
          }

          try {
            // Validate row data
            const validatedRow = excelProductRowSchema.parse(rowData);
            rows.push(validatedRow);
          } catch (error: any) {
            // Zod validation error
            if (error instanceof z.ZodError) {
              error.errors.forEach((err) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex + 2, // +2 because CSV parser doesn't include header row in index
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex + 2,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      } else {
        // Parse Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Excel file must contain at least one worksheet",
            errors: [],
          });
        }

        // Read header row to map column names to indices
        const headerRow = worksheet.getRow(1);
        const excelColumnMap: Record<string, number> = {};

        // Build column map from header row
        headerRow.eachCell((cell, colNumber) => {
          if (cell.value) {
            const headerValue = String(cell.value).trim();
            const normalized = normalizeHeader(headerValue);

            // Find matching field name (check exact matches first, then partial)
            let bestMatch: { fieldName: string; priority: number } | null =
              null;

            for (const [fieldName, variations] of Object.entries(
              headerMappings,
            )) {
              // Skip if already mapped
              if (excelColumnMap[fieldName]) continue;

              // Check for exact match (highest priority)
              if (variations.some((v) => normalized === v)) {
                bestMatch = { fieldName, priority: 2 };
                break;
              }

              // Check for contains match (lower priority)
              if (
                !bestMatch &&
                variations.some(
                  (v) => normalized.includes(v) || v.includes(normalized),
                )
              ) {
                bestMatch = { fieldName, priority: 1 };
              }
            }

            if (bestMatch) {
              excelColumnMap[bestMatch.fieldName] = colNumber;
            }
          }
        });

        // Validate that required columns are found
        const requiredColumns = [
          "imsCode",
          "category",
          "name",
          "variation",
          "costPrice",
          "finalSP",
        ];
        const missingColumns = requiredColumns.filter(
          (col) => !excelColumnMap[col],
        );

        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in Excel file",
            missingColumns,
            foundColumns: Object.keys(excelColumnMap),
            hint: "Please ensure your Excel file has headers: IMS CODE, Category, Name of Product, Variations(Designs/Colors), Cost Price, Final SP",
          });
        }

        // Parse rows (skip header row - row 1)
        worksheet.eachRow((row, rowIndex) => {
          // Skip header row
          if (rowIndex === 1) return;

          // Extract cell values using column map
          const getCellValue = (fieldName: string) => {
            const colNumber = excelColumnMap[fieldName];
            return colNumber ? row.getCell(colNumber).value : undefined;
          };

          const rowData = {
            imsCode: getCellValue("imsCode"),
            category: getCellValue("category"),
            subCategory: getCellValue("subCategory"),
            name: getCellValue("name"),
            variation: getCellValue("variation"),
            material: getCellValue("material"),
            length: getCellValue("length"),
            breadth: getCellValue("breadth"),
            height: getCellValue("height"),
            weight: getCellValue("weight"),
            vendor: getCellValue("vendor"),
            quantity: getCellValue("quantity"),
            costPrice: getCellValue("costPrice"),
            finalSP: getCellValue("finalSP"),
            nonMemberDiscount: getCellValue("nonMemberDiscount"),
            memberDiscount: getCellValue("memberDiscount"),
            wholesaleDiscount: getCellValue("wholesaleDiscount"),
          };

          // Check if row is empty (all cells are empty or null)
          const hasData = Object.values(rowData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== "",
          );
          if (!hasData) {
            return; // Skip empty rows
          }

          try {
            // Validate row data
            const validatedRow = excelProductRowSchema.parse(rowData);
            rows.push(validatedRow);
          } catch (error: any) {
            // Zod validation error
            if (error instanceof z.ZodError) {
              error.errors.forEach((err) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex,
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      }

      const tenantId = req.user!.tenantId;
      // Get all categories and discount types for lookup (tenant-scoped)
      const allCategories = await prisma.category.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
      const allDiscountTypes = await prisma.discountType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });

      // Create lookup maps
      const categoryMap = new Map(
        allCategories.map((cat) => [cat.name.toLowerCase(), cat.id]),
      );
      const discountTypeMap = new Map(
        allDiscountTypes.map((dt) => [dt.name.toLowerCase(), dt.id]),
      );

      // Group rows by IMS code and name (same product, different variations)
      const productGroups = new Map<
        string,
        { product: ExcelProductRow; variations: ExcelProductRow[] }
      >();

      rows.forEach((row) => {
        const key = `${row.imsCode}-${row.name}`;
        if (!productGroups.has(key)) {
          productGroups.set(key, {
            product: row,
            variations: [],
          });
        }
        productGroups.get(key)!.variations.push(row);
      });

      // Process each product group
      for (const [key, group] of productGroups.entries()) {
        const firstRow = group.product;
        const variations = group.variations;

        try {
          // Find or create category
          const categoryNameLower = firstRow.category.toLowerCase();
          const categoryNameOriginal = firstRow.category.trim();
          let categoryId = categoryMap.get(categoryNameLower);

          // If not found in initial map, check database and create if needed
          if (!categoryId) {
            // First try exact match
            let existingCategory = await prisma.category.findFirst({
              where: { name: categoryNameOriginal },
            });

            // If not found, try case-insensitive search using findMany
            if (!existingCategory) {
              const allCategories = await prisma.category.findMany({
                where: {
                  name: {
                    contains: categoryNameOriginal,
                    mode: "insensitive",
                  },
                },
              });
              // Find exact case-insensitive match
              existingCategory =
                allCategories.find(
                  (cat) => cat.name.toLowerCase() === categoryNameLower,
                ) || null;
            }

            if (existingCategory) {
              categoryId = existingCategory.id;
              // Update map for future lookups in this batch
              categoryMap.set(categoryNameLower, categoryId);
            } else {
              // Create new category
              try {
                const newCategory = await prisma.category.create({
                  data: {
                    tenantId: req.user!.tenantId,
                    name: categoryNameOriginal,
                  },
                });
                categoryId = newCategory.id;
                // Update map for future lookups in this batch
                categoryMap.set(categoryNameLower, categoryId);
              } catch (createError: any) {
                // If creation fails due to unique constraint (race condition),
                // try to find it again
                if (createError.code === "P2002") {
                  const foundCategory = await prisma.category.findFirst({
                    where: { name: categoryNameOriginal },
                  });
                  if (foundCategory) {
                    categoryId = foundCategory.id;
                    categoryMap.set(categoryNameLower, categoryId);
                  } else {
                    throw createError;
                  }
                } else {
                  throw createError;
                }
              }
            }
          }

          // Check if product with this IMS code already exists
          const existingProduct = await prisma.product.findFirst({
            where: { imsCode: firstRow.imsCode },
          });

          if (existingProduct) {
            errors.push({
              row: rows.indexOf(firstRow) + 2,
              field: "imsCode",
              message: `Product with IMS code "${firstRow.imsCode}" already exists`,
              value: firstRow.imsCode,
            });
            skippedProducts.push({
              imsCode: firstRow.imsCode,
              name: firstRow.name,
              reason: `Product with IMS code "${firstRow.imsCode}" already exists`,
            });
            continue;
          }

          // Prepare variations
          const productVariations = variations.map((variationRow) => ({
            color: variationRow.variation,
            stockQuantity: variationRow.quantity || 0,
          }));

          // Prepare discounts
          // Map Excel discount column names to database discount type names
          const discountMappings: Record<string, string> = {
            "non member": "Normal", // NON MEMBER DISCOUNT -> Normal
            member: "Member", // MEMBER DISCOUNT -> Member
            wholesale: "Wholesale", // WHOLESALE DISCOUNT -> Wholesale
          };

          const discounts: any[] = [];

          // Add NON MEMBER DISCOUNT if provided (maps to "Normal" discount type)
          if (
            firstRow.nonMemberDiscount !== null &&
            firstRow.nonMemberDiscount !== undefined
          ) {
            const mappedName = discountMappings["non member"];
            const discountTypeId = discountTypeMap.get(
              mappedName.toLowerCase(),
            );
            if (discountTypeId) {
              discounts.push({
                discountTypeId,
                discountPercentage: firstRow.nonMemberDiscount,
                isActive: true,
              });
            }
          }

          // Add MEMBER DISCOUNT if provided
          if (
            firstRow.memberDiscount !== null &&
            firstRow.memberDiscount !== undefined
          ) {
            const mappedName = discountMappings["member"];
            const discountTypeId = discountTypeMap.get(
              mappedName.toLowerCase(),
            );
            if (discountTypeId) {
              discounts.push({
                discountTypeId,
                discountPercentage: firstRow.memberDiscount,
                isActive: true,
              });
            }
          }

          // Add WHOLESALE DISCOUNT if provided
          if (
            firstRow.wholesaleDiscount !== null &&
            firstRow.wholesaleDiscount !== undefined
          ) {
            const mappedName = discountMappings["wholesale"];
            const discountTypeId = discountTypeMap.get(
              mappedName.toLowerCase(),
            );
            if (discountTypeId) {
              discounts.push({
                discountTypeId,
                discountPercentage: firstRow.wholesaleDiscount,
                isActive: true,
              });
            }
          }

          // Create product
          const product = await prisma.product.create({
            data: {
              tenantId: req.user!.tenantId,
              imsCode: firstRow.imsCode,
              name: firstRow.name,
              categoryId,
              description: firstRow.material || null,
              length: firstRow.length,
              breadth: firstRow.breadth,
              height: firstRow.height,
              weight: firstRow.weight,
              costPrice: firstRow.costPrice,
              mrp: firstRow.finalSP,
              createdById: req.user!.id,
              variations: {
                create: productVariations,
              },
              discounts:
                discounts.length > 0
                  ? {
                      create: discounts,
                    }
                  : undefined,
            },
            include: {
              category: true,
              variations: true,
              discounts: {
                include: {
                  discountType: true,
                },
              },
            },
          });

          createdProducts.push({
            id: product.id,
            imsCode: product.imsCode,
            name: product.name,
            variationsCount: product.variations?.length || 0,
          });
        } catch (error: any) {
          errors.push({
            row: rows.indexOf(firstRow) + 2,
            message: error.message || "Error creating product",
          });
          skippedProducts.push({
            imsCode: firstRow.imsCode,
            name: firstRow.name,
            reason: error.message || "Error creating product",
          });
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error("Error cleaning up file", req.requestId, cleanupError);
      }

      // Return response
      res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: productGroups.size,
          created: createdProducts.length,
          skipped: skippedProducts.length,
          errors: errors.length,
        },
        created: createdProducts,
        skipped: skippedProducts,
        errors: errors,
      });
    } catch (error: unknown) {
      // Clean up uploaded file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logger.error("Error cleaning up file", req.requestId, cleanupError);
        }
      }
      return sendControllerError(req, res, error, "Bulk upload error");
    }
  }

  // Download bulk upload template (headers only)
  async downloadBulkUploadTemplate(req: Request, res: Response) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products Template");

      const headers = [
        { header: "IMS Code", width: 15 },
        { header: "Category", width: 18 },
        { header: "Sub-Category", width: 15 },
        { header: "Name of Product", width: 28 },
        { header: "Variations (Designs/Colors)", width: 28 },
        { header: "Material", width: 15 },
        { header: "Length", width: 10 },
        { header: "Breadth", width: 10 },
        { header: "Height", width: 10 },
        { header: "Weight", width: 10 },
        { header: "Vendor", width: 15 },
        { header: "Qty", width: 8 },
        { header: "Cost Price", width: 12 },
        { header: "Final SP", width: 12 },
        { header: "Non Member Discount", width: 20 },
        { header: "Member Discount", width: 18 },
        { header: "Wholesale Discount", width: 20 },
      ];
      const requiredOptional = [
        "Required",
        "Required",
        "Optional",
        "Required",
        "Required",
        "Optional",
        "Optional",
        "Optional",
        "Optional",
        "Optional",
        "Optional",
        "Optional",
        "Required",
        "Required",
        "Optional",
        "Optional",
        "Optional",
      ];

      worksheet.columns = headers.map((h) => ({
        header: h.header,
        width: h.width,
      }));
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      const row2 = worksheet.getRow(2);
      requiredOptional.forEach((text, i) => {
        row2.getCell(i + 1).value = text;
      });
      row2.font = { italic: true };

      const filename = "products_bulk_upload_template.xlsx";
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  }

  // Download products as Excel or CSV
  async downloadProducts(req: Request, res: Response) {
    try {
      const format = (req.query.format as string)?.toLowerCase() || "excel";
      const idsParam = req.query.ids as string | undefined;

      // Validate format
      if (format !== "excel" && format !== "csv") {
        return res.status(400).json({
          message: "Invalid format. Supported formats: excel, csv",
        });
      }

      // Parse product IDs from query string
      let productIds: string[] | undefined;
      if (idsParam) {
        productIds = idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      // Build where clause
      const where: any = {};
      if (productIds && productIds.length > 0) {
        where.id = { in: productIds };
      }

      // Fetch products with relations
      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          variations: {
            include: {
              photos: true,
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
        orderBy: {
          dateCreated: "desc",
        },
      });

      if (products.length === 0) {
        return res.status(404).json({
          message: "No products found to export",
        });
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products");

      // Define columns
      const columns = [
        { header: "IMS Code", key: "imsCode", width: 15 },
        { header: "Product Name", key: "name", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Description", key: "description", width: 40 },
        { header: "Cost Price", key: "costPrice", width: 15 },
        { header: "MRP", key: "mrp", width: 15 },
        { header: "Length (cm)", key: "length", width: 15 },
        { header: "Breadth (cm)", key: "breadth", width: 15 },
        { header: "Height (cm)", key: "height", width: 15 },
        { header: "Weight (kg)", key: "weight", width: 15 },
        { header: "Total Stock", key: "totalStock", width: 15 },
        { header: "Variations", key: "variations", width: 40 },
        { header: "Discounts", key: "discounts", width: 40 },
      ];

      worksheet.columns = columns;

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      products.forEach((product) => {
        // Calculate total stock
        const totalStock = product.variations.reduce(
          (sum, v) => sum + (v.stockQuantity || 0),
          0,
        );

        // Format variations
        const variationsStr =
          product.variations.length > 0
            ? product.variations
                .map((v) => `${v.color} (${v.stockQuantity})`)
                .join("; ")
            : "No variations";

        // Format discounts
        const discountsStr =
          product.discounts && product.discounts.length > 0
            ? product.discounts
                .filter((d) => d.isActive)
                .map(
                  (d) =>
                    `${d.discountType?.name || "Unknown"}: ${d.discountPercentage}%`,
                )
                .join("; ")
            : "No discounts";

        worksheet.addRow({
          imsCode: product.imsCode,
          name: product.name,
          category: product.category?.name || "N/A",
          description: product.description || "N/A",
          costPrice: product.costPrice,
          mrp: product.mrp,
          length: product.length || "N/A",
          breadth: product.breadth || "N/A",
          height: product.height || "N/A",
          weight: product.weight || "N/A",
          totalStock: totalStock,
          variations: variationsStr,
          discounts: discountsStr,
        });
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `products_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

      // Set response headers
      if (format === "excel") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Generate buffer and send
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      } else {
        // CSV format - manually convert to CSV
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Helper function to escape CSV values
        const escapeCsvValue = (value: any): string => {
          if (value === null || value === undefined) {
            return "";
          }
          const str = String(value);
          // If value contains comma, newline, or quote, wrap in quotes and escape quotes
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Build CSV rows
        const csvRows: string[] = [];

        // Header row
        csvRows.push(
          columns.map((col) => escapeCsvValue(col.header)).join(","),
        );

        // Data rows
        products.forEach((product) => {
          const totalStock = product.variations.reduce(
            (sum, v) => sum + (v.stockQuantity || 0),
            0,
          );
          const variationsStr =
            product.variations.length > 0
              ? product.variations
                  .map((v) => `${v.color} (${v.stockQuantity})`)
                  .join("; ")
              : "No variations";
          const discountsStr =
            product.discounts && product.discounts.length > 0
              ? product.discounts
                  .filter((d) => d.isActive)
                  .map(
                    (d) =>
                      `${d.discountType?.name || "Unknown"}: ${d.discountPercentage}%`,
                  )
                  .join("; ")
              : "No discounts";

          const row = [
            escapeCsvValue(product.imsCode),
            escapeCsvValue(product.name),
            escapeCsvValue(product.category?.name || "N/A"),
            escapeCsvValue(product.description || "N/A"),
            escapeCsvValue(product.costPrice),
            escapeCsvValue(product.mrp),
            escapeCsvValue(product.length || "N/A"),
            escapeCsvValue(product.breadth || "N/A"),
            escapeCsvValue(product.height || "N/A"),
            escapeCsvValue(product.weight || "N/A"),
            escapeCsvValue(totalStock),
            escapeCsvValue(variationsStr),
            escapeCsvValue(discountsStr),
          ];
          csvRows.push(row.join(","));
        });

        res.send(csvRows.join("\n"));
      }
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download products error");
    }
  }
}

export default new ProductController();
