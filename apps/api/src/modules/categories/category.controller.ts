import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

class CategoryController {
  // Create category (admin and superAdmin only)
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const tenantId = req.user!.tenantId;

      const existingCategory = await prisma.category.findFirst({
        where: { tenantId, name },
      });

      if (existingCategory) {
        return res.status(409).json({
          message: "Category with this name already exists",
          existingCategory: {
            id: existingCategory.id,
            name: existingCategory.name,
          },
        });
      }

      // Create category
      const category = await prisma.category.create({
        data: {
          tenantId: req.user!.tenantId,
          name,
          description: description || null,
        },
      });

      res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "Category with this name already exists",
        });
      }
      return sendControllerError(req, res, error, "Create category error");
    }
  }

  // Get all categories (all authenticated users can view)
  async getAllCategories(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

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

      const tenantId = req.user!.tenantId;

      const where: any = { tenantId, deletedAt: null };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and categories in parallel
      const [totalItems, categories] = await Promise.all([
        prisma.category.count({ where }),
        prisma.category.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            subCategories: {
              where: { deletedAt: null },
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                products: { where: { deletedAt: null } },
              },
            },
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
      return sendControllerError(req, res, error, "Get all categories error");
    }
  }

  // Get category by ID (all authenticated users can view)
  async getCategoryById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      const tenantId = req.user!.tenantId;

      const category = await prisma.category.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          products: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              mrp: true,
              costPrice: true,
            },
            take: 10,
          },
          _count: {
            select: {
              products: { where: { deletedAt: null } },
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.status(200).json({
        message: "Category fetched successfully",
        category,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get category by ID error");
    }
  }

  // Get distinct subcategories for a category
  async getCategorySubcategories(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      const subcategoryRows = await prisma.subCategory.findMany({
        where: {
          categoryId: id,
          deletedAt: null,
        },
        select: {
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      const subcategories = subcategoryRows.map((row) => row.name);

      return res.status(200).json({
        message: "Subcategories fetched successfully",
        categoryId: id,
        subcategories,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get category subcategories error",
      );
    }
  }

  // Create a new subcategory for a category
  async createSubcategory(req: Request, res: Response) {
    try {
      const categoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name } = req.body as { name?: string };

      if (!categoryId) {
        return res.status(400).json({ message: "Category ID is required" });
      }
      if (!name || !name.trim()) {
        return res
          .status(400)
          .json({ message: "Subcategory name is required" });
      }

      const tenantId = req.user!.tenantId;

      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const existing = await prisma.subCategory.findFirst({
        where: {
          categoryId,
          name: name.trim(),
        },
      });
      if (existing) {
        return res.status(409).json({
          message:
            "Subcategory with this name already exists for this category",
          subCategory: existing,
        });
      }

      const subCategory = await prisma.subCategory.create({
        data: {
          name: name.trim(),
          categoryId,
        },
      });

      return res.status(201).json({
        message: "Subcategory created successfully",
        subCategory,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create subcategory error");
    }
  }

  // Delete a subcategory from a category
  async deleteSubcategory(req: Request, res: Response) {
    try {
      const categoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name } = req.body as { name?: string };

      if (!categoryId) {
        return res.status(400).json({ message: "Category ID is required" });
      }
      if (!name || !name.trim()) {
        return res
          .status(400)
          .json({ message: "Subcategory name is required" });
      }

      const subCategory = await prisma.subCategory.findFirst({
        where: {
          categoryId,
          name: name.trim(),
        },
      });

      if (!subCategory) {
        return res.status(404).json({
          message: "Subcategory not found for this category",
        });
      }

      // Prevent deletion if products are linked
      const linkedProducts = await prisma.product.count({
        where: { subCategoryId: subCategory.id },
      });

      if (linkedProducts > 0) {
        return res.status(400).json({
          message:
            "Cannot delete subcategory that is linked to existing products",
        });
      }

      await prisma.subCategory.update({
        where: { id: subCategory.id },
        data: { deletedAt: new Date() },
      });

      return res.status(200).json({
        message: "Subcategory deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete subcategory error");
    }
  }

  // Update category (admin and superAdmin only)
  async updateCategory(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name, description } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      const tenantId = req.user!.tenantId;

      const existingCategory = await prisma.category.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      if (name && name !== existingCategory.name) {
        const nameExists = await prisma.category.findFirst({
          where: { tenantId, name, id: { not: id } },
        });

        if (nameExists) {
          return res.status(409).json({
            message: "Category with this name already exists",
            existingCategory: {
              id: nameExists.id,
              name: nameExists.name,
            },
          });
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name;
      }

      if (description !== undefined) {
        updateData.description = description || null;
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "Category with this name already exists",
        });
      }
      return sendControllerError(req, res, error, "Update category error");
    }
  }

  // Delete category (admin and superAdmin only)
  async deleteCategory(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      const tenantId = req.user!.tenantId;

      const existingCategory = await prisma.category.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: { where: { deletedAt: null } },
            },
          },
        },
      });

      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Check if category has products (Prisma will prevent deletion due to Restrict, but we can provide better error)
      if (existingCategory._count.products > 0) {
        return res.status(400).json({
          message: "Cannot delete category with existing products",
          productCount: existingCategory._count.products,
          hint: "Please remove or reassign all products in this category before deleting",
        });
      }

      await prisma.category.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      res.status(200).json({
        message: "Category deleted successfully",
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2003") {
        return res.status(400).json({
          message: "Cannot delete category because it has associated products",
        });
      }
      return sendControllerError(req, res, error, "Delete category error");
    }
  }
}

export default new CategoryController();
