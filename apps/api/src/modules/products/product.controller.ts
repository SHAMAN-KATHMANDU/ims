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
import type { ExcelProductRow } from "./bulkUpload.validation";
import { getProductBulkParseOptions } from "./bulkUpload.validation";
import {
  processProductBulkRows,
  buildProductBulkTemplate,
} from "./product.bulk.service";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "./product.validation";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";

class ProductController {
  // Create product (admin and superAdmin only). Requires a valid warehouse/location before create (see location resolution below).
  async createProduct(req: Request, res: Response) {
    try {
      const {
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
        variations,
        discounts,
        attributeTypeIds,
        vendorId,
        defaultLocationId,
      } = req.body as CreateProductInput;

      const tenantId = req.user!.tenantId;

      // DB-level existence checks
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId },
      });
      if (!category) {
        return res.status(404).json({
          message: "Category not found",
          providedCategoryId: categoryId,
        });
      }

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

      // Resolve discount types
      const resolvedDiscounts = [];
      if (discounts) {
        for (const discount of discounts) {
          const discountType = await prisma.discountType.findFirst({
            where: { id: discount.discountTypeId, tenantId },
          });
          if (!discountType) {
            return res.status(404).json({
              message: "Discount type not found",
              providedDiscountTypeId: discount.discountTypeId,
            });
          }

          const pct = discount.discountPercentage;
          resolvedDiscounts.push({
            discountTypeId: discountType.id,
            discountPercentage: pct,
            valueType: discount.valueType,
            value: discount.value ?? pct,
            startDate: parseDate(discount.startDate)?.toJSDate() ?? null,
            endDate: parseDate(discount.endDate)?.toJSDate() ?? null,
            isActive: discount.isActive,
          });
        }
      }

      // Check for duplicate IMS codes already in the DB (tenant-scoped)
      const variationImsCodes = variations.map((v) => v.imsCode);
      const existingVariationIms = await prisma.productVariation.findMany({
        where: { tenantId, imsCode: { in: variationImsCodes } },
        select: { imsCode: true },
      });
      if (existingVariationIms.length > 0) {
        return res.status(409).json({
          message: "One or more IMS codes already exist for this tenant",
          existing: existingVariationIms.map((v) => v.imsCode),
        });
      }

      // --- Resolve target warehouse BEFORE creating product ---
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
              "Product creation failed: the selected location is invalid or does not belong to your tenant",
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
          // Add variations (sku + attributes)
          variations:
            variations && Array.isArray(variations)
              ? {
                  create: variations.map((variation: any) => ({
                    tenantId,
                    imsCode: (variation.imsCode ?? variation.sku ?? "").trim(),
                    stockQuantity: variation.stockQuantity || 0,
                    costPriceOverride:
                      variation.costPriceOverride != null
                        ? parseFloat(variation.costPriceOverride)
                        : null,
                    mrpOverride:
                      variation.mrpOverride != null
                        ? parseFloat(variation.mrpOverride)
                        : null,
                    finalSpOverride:
                      variation.finalSpOverride != null
                        ? parseFloat(variation.finalSpOverride)
                        : null,
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
                    attributes:
                      variation.attributes &&
                      Array.isArray(variation.attributes)
                        ? {
                            create: variation.attributes.map(
                              (a: {
                                attributeTypeId: string;
                                attributeValueId: string;
                              }) => ({
                                attributeTypeId: a.attributeTypeId,
                                attributeValueId: a.attributeValueId,
                              }),
                            ),
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
                    discountPercentage: discount.discountPercentage,
                    valueType: discount.valueType || "PERCENTAGE",
                    value: discount.value ?? discount.discountPercentage,
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
              attributes: {
                include: {
                  attributeType: {
                    select: { id: true, name: true, code: true },
                  },
                  attributeValue: {
                    select: { id: true, value: true, code: true },
                  },
                },
              },
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      // Link product attribute types (EAV: which attribute types this product uses)
      if (
        attributeTypeIds &&
        Array.isArray(attributeTypeIds) &&
        attributeTypeIds.length > 0
      ) {
        const validTypeIds = await prisma.attributeType.findMany({
          where: { id: { in: attributeTypeIds }, tenantId },
          select: { id: true },
        });
        if (validTypeIds.length > 0) {
          await prisma.productAttributeType.createMany({
            data: validTypeIds.map((t, i) => ({
              productId: product.id,
              attributeTypeId: t.id,
              displayOrder: i,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Link product to location (warehouseLocation already resolved and validated above)
      // Only create inventory records for variations that actually have stock > 0
      try {
        if (warehouseLocation && product.variations?.length) {
          for (const v of product.variations) {
            const hasSubVariants =
              Array.isArray((v as any).subVariations) &&
              (v as any).subVariations.length > 0;
            if (hasSubVariants) continue; // stock is per location per sub-variant via inventory API
            const qty = Math.max(0, Number(v.stockQuantity) || 0);
            if (qty === 0) continue; // don't create 0-stock inventory rows
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
              name: product.name,
              variationImsCodes:
                product.variations?.map((v) => v.imsCode) ?? [],
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
            target.some((f) => f === "ims_code") &&
            target.some((f) => f === "tenantId" || f === "tenant_id"));
        return res.status(409).json({
          message: isImsConflict
            ? "Product with this IMS code already exists"
            : "A duplicate value was provided.",
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
        "dateCreated",
        "dateModified",
        "name",
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
          {
            variations: {
              some: { imsCode: { contains: search, mode: "insensitive" } },
            },
          },
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
            productAttributeTypes: {
              include: {
                attributeType: { select: { id: true, name: true, code: true } },
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
                  attributeType: {
                    select: { id: true, name: true, code: true },
                  },
                  attributeValue: {
                    select: { id: true, value: true, code: true },
                  },
                },
              },
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
        attributeTypeIds,
      } = req.body as UpdateProductInput;

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return res.status(404).json({
          message: "Product not found",
          productId: id,
        });
      }

      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
      }

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

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (description !== undefined)
        updateData.description = description || null;
      if (subCategory !== undefined) {
        updateData.subCategory =
          subCategory && subCategory.trim().length > 0
            ? subCategory.trim()
            : null;
      }
      if (length !== undefined) updateData.length = length ?? null;
      if (breadth !== undefined) updateData.breadth = breadth ?? null;
      if (height !== undefined) updateData.height = height ?? null;
      if (weight !== undefined) updateData.weight = weight ?? null;
      if (costPrice !== undefined) updateData.costPrice = costPrice;
      if (mrp !== undefined) updateData.mrp = mrp;
      if (vendorId !== undefined) updateData.vendorId = vendorId || null;

      // Handle variations update if provided (match by ID; do not delete variations referenced by sales/transfers)
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

        const incomingVariations: any[] = Array.isArray(variations)
          ? variations
          : [];
        const incomingIds = new Set(
          incomingVariations.map((v: any) => v.id).filter(Boolean) as string[],
        );

        // Update existing or delete removed variations
        for (const existing of existingVariations) {
          const hasDependents =
            (existing._count?.saleItems ?? 0) > 0 ||
            (existing._count?.transferItems ?? 0) > 0;

          if (incomingIds.has(existing.id)) {
            // Variation still present -- update it
            const payload = incomingVariations.find(
              (v: any) => v.id === existing.id,
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
            // Variation removed from the form and has no sale/transfer references -- safe to delete
            await prisma.productVariation.delete({
              where: { id: existing.id },
            });
          }
        }

        // Create new variations (those without an id, i.e. added in the form)
        const existingIdSet = new Set(existingVariations.map((e) => e.id));
        for (const variation of incomingVariations) {
          if (variation.id && existingIdSet.has(variation.id)) continue;

          const imsCode = (variation.imsCode ?? variation.sku ?? "").trim();
          if (!imsCode) continue;

          const conflict = await prisma.productVariation.findFirst({
            where: { tenantId: req.user!.tenantId, imsCode },
          });
          if (conflict) continue;

          await prisma.productVariation.create({
            data: {
              tenantId: req.user!.tenantId,
              productId: id,
              imsCode,
              stockQuantity: variation.stockQuantity || 0,
              costPriceOverride:
                variation.costPriceOverride != null
                  ? parseFloat(variation.costPriceOverride)
                  : null,
              mrpOverride:
                variation.mrpOverride != null
                  ? parseFloat(variation.mrpOverride)
                  : null,
              finalSpOverride:
                variation.finalSpOverride != null
                  ? parseFloat(variation.finalSpOverride)
                  : null,
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
              attributes:
                variation.attributes && Array.isArray(variation.attributes)
                  ? {
                      create: variation.attributes.map(
                        (a: {
                          attributeTypeId: string;
                          attributeValueId: string;
                        }) => ({
                          attributeTypeId: a.attributeTypeId,
                          attributeValueId: a.attributeValueId,
                        }),
                      ),
                    }
                  : undefined,
            },
          });
        }
      }

      // Handle discounts update if provided
      if (discounts !== undefined) {
        const tenantId = req.user!.tenantId;

        await prisma.productDiscount.deleteMany({
          where: { productId: id },
        });

        if (discounts && discounts.length > 0) {
          const resolvedDiscounts = [];

          for (const discount of discounts) {
            const discountType = await prisma.discountType.findFirst({
              where: { id: discount.discountTypeId, tenantId },
            });
            if (!discountType) {
              return res.status(404).json({
                message: "Discount type not found",
                providedDiscountTypeId: discount.discountTypeId,
              });
            }

            const pct = discount.discountPercentage;
            resolvedDiscounts.push({
              discountTypeId: discountType.id,
              discountPercentage: pct,
              valueType: discount.valueType,
              value: discount.value ?? pct,
              startDate: parseDate(discount.startDate)?.toJSDate() ?? null,
              endDate: parseDate(discount.endDate)?.toJSDate() ?? null,
              isActive: discount.isActive,
            });
          }

          if (resolvedDiscounts.length > 0) {
            updateData.discounts = {
              create: resolvedDiscounts,
            };
          }
        }
      }

      if (attributeTypeIds !== undefined) {
        await prisma.productAttributeType.deleteMany({
          where: { productId: id },
        });
        if (Array.isArray(attributeTypeIds) && attributeTypeIds.length > 0) {
          const tenantId = req.user!.tenantId;
          const validTypeIds = await prisma.attributeType.findMany({
            where: { id: { in: attributeTypeIds }, tenantId },
            select: { id: true },
          });
          if (validTypeIds.length > 0) {
            await prisma.productAttributeType.createMany({
              data: validTypeIds.map((t, i) => ({
                productId: id,
                attributeTypeId: t.id,
                displayOrder: i,
              })),
              skipDuplicates: true,
            });
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
                  attributeType: {
                    select: { id: true, name: true, code: true },
                  },
                  attributeValue: {
                    select: { id: true, value: true, code: true },
                  },
                },
              },
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
            target.some((f) => f === "ims_code") &&
            target.some((f) => f === "tenantId" || f === "tenant_id"));
        return res.status(409).json({
          message: isImsConflict
            ? "Product with this IMS code already exists"
            : "A duplicate value was provided.",
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

      await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete product error");
    }
  }

  // Delete a single variation from a product (admin and superAdmin only)
  async deleteVariation(req: Request, res: Response) {
    try {
      const productId = Array.isArray(req.params.productId)
        ? req.params.productId[0]
        : req.params.productId;
      const variationId = Array.isArray(req.params.variationId)
        ? req.params.variationId[0]
        : req.params.variationId;
      const tenantId = req.user!.tenantId;

      const variation = await prisma.productVariation.findFirst({
        where: { id: variationId, productId, tenantId },
        include: {
          _count: { select: { saleItems: true, transferItems: true } },
        },
      });

      if (!variation) {
        return res.status(404).json({ message: "Variation not found" });
      }

      const hasDependents =
        (variation._count?.saleItems ?? 0) > 0 ||
        (variation._count?.transferItems ?? 0) > 0;

      if (hasDependents) {
        return res.status(409).json({
          message:
            "Cannot delete this variation because it has associated sales or transfers. Remove those records first.",
        });
      }

      const siblingCount = await prisma.productVariation.count({
        where: { productId, id: { not: variationId } },
      });

      if (siblingCount === 0) {
        return res.status(400).json({
          message:
            "Cannot delete the last variation of a product. Delete the product instead.",
        });
      }

      await prisma.productVariation.delete({ where: { id: variationId } });

      res.status(200).json({ message: "Variation deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete variation error");
    }
  }

  // Get all categories (helper endpoint for dropdown/selection)
  async getAllCategories(req: Request, res: Response) {
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

      const where = { tenantId, deletedAt: null };
      const skip = (page - 1) * limit;

      const [totalItems, categories] = await Promise.all([
        prisma.category.count({ where }),
        prisma.category.findMany({
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
            defaultPercentage: true,
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

  // Create a discount type (name + optional default percentage)
  async createDiscountType(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { name, description, defaultPercentage } = req.body as {
        name: string;
        description?: string;
        defaultPercentage?: number;
      };

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name is required",
        });
      }

      const trimmedName = name.trim();
      const existing = await prisma.discountType.findFirst({
        where: { tenantId, name: trimmedName },
      });
      if (existing) {
        return res.status(409).json({
          message: "A discount type with this name already exists",
          existingId: existing.id,
        });
      }

      const pct =
        defaultPercentage != null
          ? Math.min(100, Math.max(0, Number(defaultPercentage)))
          : null;

      const discountType = await prisma.discountType.create({
        data: {
          tenantId,
          name: trimmedName,
          description:
            typeof description === "string" && description.trim()
              ? description.trim()
              : null,
          defaultPercentage: pct,
        },
        select: {
          id: true,
          name: true,
          description: true,
          defaultPercentage: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        message: "Discount type created successfully",
        discountType,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create discount type error");
    }
  }

  // Update a discount type
  async updateDiscountType(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = req.params.id as string;
      const { name, description, defaultPercentage } = req.body as {
        name?: string;
        description?: string;
        defaultPercentage?: number;
      };

      const existing = await prisma.discountType.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({
          message: "Discount type not found",
          discountTypeId: id,
        });
      }

      const data: {
        name?: string;
        description?: string | null;
        defaultPercentage?: number | null;
      } = {};
      if (name !== undefined) {
        const trimmed = typeof name === "string" ? name.trim() : "";
        if (!trimmed) {
          return res.status(400).json({ message: "Name cannot be empty" });
        }
        const duplicate = await prisma.discountType.findFirst({
          where: { tenantId, name: trimmed, id: { not: id } },
        });
        if (duplicate) {
          return res.status(409).json({
            message: "Another discount type with this name already exists",
          });
        }
        data.name = trimmed;
      }
      if (description !== undefined) {
        data.description =
          typeof description === "string" && description.trim()
            ? description.trim()
            : null;
      }
      if (defaultPercentage !== undefined) {
        data.defaultPercentage =
          defaultPercentage == null
            ? null
            : Math.min(100, Math.max(0, Number(defaultPercentage)));
      }

      const discountType = await prisma.discountType.update({
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

      res.status(200).json({
        message: "Discount type updated successfully",
        discountType,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update discount type error");
    }
  }

  // Delete a discount type (fails if any product discount uses it)
  async deleteDiscountType(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = req.params.id as string;

      const existing = await prisma.discountType.findFirst({
        where: { id, tenantId },
        include: { _count: { select: { productDiscounts: true } } },
      });
      if (!existing) {
        return res.status(404).json({
          message: "Discount type not found",
          discountTypeId: id,
        });
      }

      if (existing._count.productDiscounts > 0) {
        return res.status(400).json({
          message:
            "Cannot delete: this discount type is in use by one or more products. Remove it from products first.",
          productDiscountsCount: existing._count.productDiscounts,
        });
      }

      await prisma.discountType.delete({ where: { id } });

      res.status(200).json({
        message: "Discount type deleted successfully",
        discountTypeId: id,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete discount type error");
    }
  }

  // Get all product discounts with filters, sort, search (for discounts page)
  async getAllProductDiscounts(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );
      const productId = req.query.productId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const subCategoryId = req.query.subCategoryId as string | undefined;
      const discountTypeId = req.query.discountTypeId as string | undefined;

      const where: any = { product: { tenantId } };
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
              variations: {
                some: { imsCode: { contains: search, mode: "insensitive" } },
              },
            },
          },
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
      const tenantId = req.user!.tenantId;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Check if product exists (tenant-scoped)
      const product = await prisma.product.findFirst({
        where: { id, tenantId },
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

      type DiscountWithType = (typeof discounts)[number];
      const formattedDiscounts = discounts.map((discount: DiscountWithType) => {
        const dt = (
          discount as DiscountWithType & {
            discountType: { id: string; name: string };
          }
        ).discountType;
        const effectiveValue =
          Number(discount.value) || Number(discount.discountPercentage);
        return {
          id: discount.id,
          name: dt.name,
          value: effectiveValue,
          valueType: discount.valueType,
          discountType: dt.name,
          discountTypeId: dt.id,
          startDate: discount.startDate,
          endDate: discount.endDate,
        };
      });

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
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          errors: [],
        });
      }

      let parseResult: { rows: ExcelProductRow[]; errors: ValidationError[] };
      try {
        parseResult = await parseBulkFile<ExcelProductRow>(
          req.file.path,
          req.file.originalname,
          getProductBulkParseOptions(),
        );
      } catch (err: unknown) {
        const e = err as { status?: number; body?: unknown };
        if (e?.status != null && e?.body != null) {
          return res.status(e.status).json(e.body);
        }
        throw err;
      }

      const { rows, errors: parseErrors } = parseResult;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const processResult = await processProductBulkRows(rows, {
        tenantId,
        userId,
      });

      const allErrors = [...parseErrors, ...processResult.errors];

      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error("Error cleaning up file", req.requestId, cleanupError);
      }

      const totalGroups =
        processResult.created.length +
        processResult.updated.length +
        processResult.skipped.length;
      res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: totalGroups,
          created: processResult.created.length,
          updated: processResult.updated.length,
          skipped: processResult.skipped.length,
          errors: allErrors.length,
        },
        created: processResult.created,
        updated: processResult.updated,
        skipped: processResult.skipped,
        errors: allErrors,
      });
    } catch (error: unknown) {
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
      const buffer = await buildProductBulkTemplate();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="products_bulk_upload_template.xlsx"',
      );
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
                .map((v) => `${v.imsCode} (${v.stockQuantity})`)
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
          imsCode: product.variations?.map((v) => v.imsCode).join(", ") ?? "",
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
                  .map((v) => `${v.imsCode} (${v.stockQuantity})`)
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
            escapeCsvValue(
              product.variations?.map((v) => v.imsCode).join(", ") ?? "",
            ),
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
