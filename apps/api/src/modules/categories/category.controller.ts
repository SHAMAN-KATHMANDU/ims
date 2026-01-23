import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

class CategoryController {
  // Create category (admin and superAdmin only)
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Check if category already exists
      const existingCategory = await prisma.category.findUnique({
        where: { name },
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
          name,
          description: description || null,
        },
      });

      res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error: any) {
      console.error("Create category error:", error);
      // Handle unique constraint violation
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Category with this name already exists",
          error: error.message,
        });
      }
      res
        .status(500)
        .json({ message: "Error creating category", error: error.message });
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

      // Build search filter
      const where: any = {};
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
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                products: true,
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
    } catch (error: any) {
      console.error("Get all categories error:", error);
      res
        .status(500)
        .json({ message: "Error fetching categories", error: error.message });
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

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              imsCode: true,
              name: true,
              mrp: true,
              costPrice: true,
            },
            take: 10, // Limit to first 10 products
          },
          _count: {
            select: {
              products: true,
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
    } catch (error: any) {
      console.error("Get category by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching category", error: error.message });
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

      // Fetch from SubCategory table instead of inferring from products
      const subcategoryRows = await prisma.subCategory.findMany({
        where: {
          categoryId: id,
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
    } catch (error: any) {
      console.error("Get category subcategories error:", error);
      res.status(500).json({
        message: "Error fetching subcategories",
        error: error.message,
      });
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

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
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
    } catch (error: any) {
      console.error("Create subcategory error:", error);
      res.status(500).json({
        message: "Error creating subcategory",
        error: error.message,
      });
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

      await prisma.subCategory.delete({
        where: { id: subCategory.id },
      });

      return res.status(200).json({
        message: "Subcategory deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete subcategory error:", error);
      res.status(500).json({
        message: "Error deleting subcategory",
        error: error.message,
      });
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

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      // If name is being updated, check if new name already exists
      if (name && name !== existingCategory.name) {
        const nameExists = await prisma.category.findUnique({
          where: { name },
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
    } catch (error: any) {
      console.error("Update category error:", error);
      // Handle unique constraint violation
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Category with this name already exists",
          error: error.message,
        });
      }
      res
        .status(500)
        .json({ message: "Error updating category", error: error.message });
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

      // Check if category exists and get product count
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
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

      await prisma.category.delete({
        where: { id },
      });

      res.status(200).json({
        message: "Category deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete category error:", error);
      // Handle foreign key constraint violation
      if (error.code === "P2003") {
        return res.status(400).json({
          message: "Cannot delete category because it has associated products",
          error: error.message,
        });
      }
      res
        .status(500)
        .json({ message: "Error deleting category", error: error.message });
    }
  }
}

export default new CategoryController();
