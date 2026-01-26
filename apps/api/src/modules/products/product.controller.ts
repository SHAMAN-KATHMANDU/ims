import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { parseDate } from "@repo/shared";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

class ProductController {
  // Create product (admin and superAdmin only)
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

      // Get all categories and discount types for lookup
      const allCategories = await prisma.category.findMany({
        select: { id: true, name: true },
      });
      const allDiscountTypes = await prisma.discountType.findMany({
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
          category = await prisma.category.findUnique({
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

          // Try by ID first
          if (discount.discountTypeId) {
            discountType = await prisma.discountType.findUnique({
              where: { id: discount.discountTypeId },
            });
          }

          // If not found by ID, try by name
          if (!discountType && discount.discountTypeName) {
            discountType = await prisma.discountType.findUnique({
              where: { name: discount.discountTypeName },
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
            discountType = await prisma.discountType.findUnique({
              where: { name: discount.discountTypeId },
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

      // Create product
      const product = await prisma.product.create({
        data: {
          imsCode: imsCode as string,
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
          createdById: req.user.id,
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
            },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error: any) {
      console.error("Create product error:", error);
      // Handle unique constraint violation
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Product with this IMS code already exists",
          error: error.message,
        });
      }
      res
        .status(500)
        .json({ message: "Error creating product", error: error.message });
    }
  }

  // Get all products (all authenticated users can view)
  async getAllProducts(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse optional locationId filter
      const locationId = req.query.locationId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "imsCode",
        "name",
        "costPrice",
        "mrp",
        "dateCreated",
        "dateModified",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        dateCreated: "desc",
      };

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

      // If locationId is provided, filter products that have inventory at that location
      if (locationId) {
        where.variations = {
          some: {
            locationInventory: {
              some: {
                locationId,
                quantity: { gt: 0 },
              },
            },
          },
        };
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build include object based on whether locationId is provided
      const variationsInclude: any = {
        photos: true,
      };

      // If locationId is provided, include location-specific inventory
      if (locationId) {
        variationsInclude.locationInventory = {
          where: { locationId },
          select: {
            quantity: true,
            location: {
              select: { id: true, name: true, type: true },
            },
          },
        };
      }

      // Get total count and products in parallel
      const [totalItems, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
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
    } catch (error: any) {
      console.error("Get all products error:", error);
      res
        .status(500)
        .json({ message: "Error fetching products", error: error.message });
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
    } catch (error: any) {
      console.error("Get product by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching product", error: error.message });
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

      console.log(
        `[UpdateProduct] Attempting to update product with ID: ${id}`,
      );

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        console.log(
          `[UpdateProduct] Product with ID ${id} not found in database`,
        );
        return res.status(404).json({
          message: "Product not found",
          productId: id,
        });
      }

      console.log(
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
        updateData.imsCode = imsCode;
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

      // Handle variations update if provided
      if (variations !== undefined) {
        // Delete existing variations and create new ones
        await prisma.productVariation.deleteMany({
          where: { productId: id },
        });

        if (Array.isArray(variations) && variations.length > 0) {
          updateData.variations = {
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
            })),
          };
        }
      }

      // Handle discounts update if provided
      if (discounts !== undefined) {
        // Get all discount types for lookup
        const allDiscountTypes = await prisma.discountType.findMany({
          select: { id: true, name: true },
        });

        // Delete existing discounts and create new ones
        await prisma.productDiscount.deleteMany({
          where: { productId: id },
        });

        if (Array.isArray(discounts) && discounts.length > 0) {
          const resolvedDiscounts = [];

          for (const discount of discounts) {
            // Try to find discount type by ID or name
            const identifier =
              discount.discountTypeId || discount.discountTypeName;

            const discountType = await prisma.discountType.findFirst({
              where: {
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

      res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error: any) {
      console.error("Update product error:", error);
      // Handle unique constraint violation
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Product with this IMS code already exists",
          error: error.message,
        });
      }
      res
        .status(500)
        .json({ message: "Error updating product", error: error.message });
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
    } catch (error: any) {
      console.error("Delete product error:", error);
      res
        .status(500)
        .json({ message: "Error deleting product", error: error.message });
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
    } catch (error: any) {
      console.error("Get categories error:", error);
      res
        .status(500)
        .json({ message: "Error fetching categories", error: error.message });
    }
  }

  // Get all discount types (helper endpoint for dropdown/selection)
  async getAllDiscountTypes(req: Request, res: Response) {
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

      // Get total count and discount types in parallel
      const [totalItems, discountTypes] = await Promise.all([
        prisma.discountType.count(),
        prisma.discountType.findMany({
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
    } catch (error: any) {
      console.error("Get discount types error:", error);
      res.status(500).json({
        message: "Error fetching discount types",
        error: error.message,
      });
    }
  }

  // Get active discounts for a product
  async getProductDiscounts(req: Request, res: Response) {
    try {
      const { id } = req.params;

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

      // Format the response
      const formattedDiscounts = discounts.map((discount) => ({
        id: discount.id,
        name: discount.discountType.name,
        value: Number(discount.value),
        valueType: discount.valueType,
        discountType: discount.discountType.name,
        discountTypeId: discount.discountType.id,
        startDate: discount.startDate,
        endDate: discount.endDate,
      }));

      res.status(200).json({
        message: "Product discounts fetched successfully",
        discounts: formattedDiscounts,
      });
    } catch (error: any) {
      console.error("Get product discounts error:", error);
      res.status(500).json({
        message: "Error fetching product discounts",
        error: error.message,
      });
    }
  }
}

export default new ProductController();
