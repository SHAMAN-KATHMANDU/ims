import { Request, Response } from "express";
import prisma from "@/config/prisma";

class ProductController {
  // Create product (admin and superAdmin only)
  async createProduct(req: Request, res: Response) {
    try {
      const { 
        imsCode, 
        name, 
        categoryId, 
        description, 
        length, 
        breadth, 
        height, 
        weight, 
        costPrice, 
        mrp,
        variations,//Array of color variations
        discounts//Array of discounts
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
          hint: "You can use either 'categoryId' (UUID) or 'categoryName' (string)"
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
      const allCategories = await prisma.category.findMany({ select: { id: true, name: true } });
      const allDiscountTypes = await prisma.discountType.findMany({ select: { id: true, name: true } });
    
      // Support both categoryId (UUID) and categoryName (string) lookup
      let category;
      if (categoryIdentifier) {
        // Try UUID first
        category = await prisma.category.findUnique({
          where: { id: categoryIdentifier }
        });
        
        // If not found by UUID, try by name
        if (!category) {
          category = await prisma.category.findUnique({
            where: { name: categoryIdentifier }
          });
        }
      }
      
      if (!category) {
        return res.status(404).json({ 
          message: "Category not found",
          providedCategoryId: categoryIdentifier,
          hint: "You can use either category UUID or category name",
          availableCategories: allCategories.map(c => ({ id: c.id, name: c.name }))
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
              where: { id: discount.discountTypeId }
            });
          }
          
          // If not found by ID, try by name
          if (!discountType && discount.discountTypeName) {
            discountType = await prisma.discountType.findUnique({
              where: { name: discount.discountTypeName }
            });
          }
          
          // If still not found, try using discountTypeId as name (for convenience)
          if (!discountType && discount.discountTypeId && !discount.discountTypeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            discountType = await prisma.discountType.findUnique({
              where: { name: discount.discountTypeId }
            });
          }
          
          if (!discountType) {
            return res.status(404).json({ 
              message: "Discount type not found",
              providedDiscountTypeId: discount.discountTypeId,
              providedDiscountTypeName: discount.discountTypeName,
              hint: "You can use either discountTypeId (UUID) or discountTypeName (string like 'Normal', 'Member', etc.)",
              availableDiscountTypes: allDiscountTypes.map(dt => ({ id: dt.id, name: dt.name }))
            });
          }
          
          // Handle date parsing - only set dates if they are valid strings
          let startDate = null;
          let endDate = null;
          
          if (discount.startDate && discount.startDate.trim() !== "") {
            const parsedStartDate = new Date(discount.startDate);
            if (!isNaN(parsedStartDate.getTime())) {
              startDate = parsedStartDate;
            }
          }
          
          if (discount.endDate && discount.endDate.trim() !== "") {
            const parsedEndDate = new Date(discount.endDate);
            if (!isNaN(parsedEndDate.getTime())) {
              endDate = parsedEndDate;
            }
          }
          
          resolvedDiscounts.push({
            discountTypeId: discountType.id,
            discountPercentage: parseFloat(discount.discountPercentage.toString()),
            startDate: startDate,
            endDate: endDate,
            isActive: discount.isActive !== undefined ? discount.isActive : true
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
          length: length ? parseFloat(length.toString()) : null,
          breadth: breadth ? parseFloat(breadth.toString()) : null,
          height: height ? parseFloat(height.toString()) : null,
          weight: weight ? parseFloat(weight.toString()) : null,
          costPrice: parseFloat(costPrice.toString()),
          mrp: parseFloat(mrp.toString()),
          createdById: req.user.id,
          // Add variations (colors with photos)
          variations: variations && Array.isArray(variations) ? {
            create: variations.map((variation: any) => ({
              color: variation.color,
              stockQuantity: variation.stockQuantity || 0,
              photos: variation.photos && Array.isArray(variation.photos) ? {
                create: variation.photos.map((photo: any) => ({
                  photoUrl: photo.photoUrl,
                  isPrimary: photo.isPrimary || false
                }))
              } : undefined
            }))
          } : undefined,
          // Add discounts (use resolved discounts with actual UUIDs)
          discounts: resolvedDiscounts.length > 0 ? {
            create: resolvedDiscounts.map((discount: any) => {
              // Handle date parsing - only set dates if they are valid strings
              let startDate = null;
              let endDate = null;
              
              if (discount.startDate && discount.startDate.trim && discount.startDate.trim() !== "") {
                const parsedStartDate = new Date(discount.startDate);
                if (!isNaN(parsedStartDate.getTime())) {
                  startDate = parsedStartDate;
                }
              }
              
              if (discount.endDate && discount.endDate.trim && discount.endDate.trim() !== "") {
                const parsedEndDate = new Date(discount.endDate);
                if (!isNaN(parsedEndDate.getTime())) {
                  endDate = parsedEndDate;
                }
              }
              
              return {
                discountTypeId: discount.discountTypeId,
                discountPercentage: parseFloat(discount.discountPercentage.toString()),
                startDate: startDate,
                endDate: endDate,
                isActive: discount.isActive !== undefined ? discount.isActive : true
              };
            })
          } : undefined
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          },
          variations: {
            include: {
              photos: true
            }
          },
          discounts: {
            include: {
              discountType: true
            }
          }
        }
      });

      res.status(201).json({ 
        message: "Product created successfully",
        product
      });
    } catch (error: any) {
      console.error("Create product error:", error);
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          message: "Product with this IMS code already exists",
          error: error.message 
        });
      }
      res.status(500).json({ message: "Error creating product", error: error.message });
    }
  }

  // Get all products (all authenticated users can view)
  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          },
          variations: {
            include: {
              photos: true
            }
          },
          discounts: {
            include: {
              discountType: true
            }
          }
        },
        orderBy: {
          dateCreated: 'desc'
        }
      });

      res.status(200).json({ 
        message: "Products fetched successfully",
        products,
        count: products.length
      });
    } catch (error: any) {
      console.error("Get all products error:", error);
      res.status(500).json({ message: "Error fetching products", error: error.message });
    }
  }

  // Get product by ID (all authenticated users can view)
  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          },
          variations: {
            include: {
              photos: true
            }
          },
          discounts: {
            include: {
              discountType: true
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.status(200).json({ 
        message: "Product fetched successfully",
        product
      });
    } catch (error: any) {
      console.error("Get product by ID error:", error);
      res.status(500).json({ message: "Error fetching product", error: error.message });
    }
  }

  // Update product (admin and superAdmin only)
  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        imsCode, 
        name, 
        categoryId, 
        description, 
        length, 
        breadth, 
        height, 
        weight, 
        costPrice, 
        mrp,
        variations,
        discounts
      } = req.body;

      console.log(`[UpdateProduct] Attempting to update product with ID: ${id}`);
      
      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        console.log(`[UpdateProduct] Product with ID ${id} not found in database`);
        return res.status(404).json({ 
          message: "Product not found",
          productId: id
        });
      }

      console.log(`[UpdateProduct] Product found: ${existingProduct.name} (${existingProduct.imsCode})`);

      // If categoryId is being updated, validate it exists
      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
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

      // Handle variations update if provided
      if (variations !== undefined) {
        // Delete existing variations and create new ones
        await prisma.productVariation.deleteMany({
          where: { productId: id }
        });
        
        if (Array.isArray(variations) && variations.length > 0) {
          updateData.variations = {
            create: variations.map((variation: any) => ({
              color: variation.color,
              stockQuantity: variation.stockQuantity || 0,
              photos: variation.photos && Array.isArray(variation.photos) ? {
                create: variation.photos.map((photo: any) => ({
                  photoUrl: photo.photoUrl,
                  isPrimary: photo.isPrimary || false
                }))
              } : undefined
            }))
          };
        }
      }

      // Handle discounts update if provided
      if (discounts !== undefined) {
        // Get all discount types for lookup
        const allDiscountTypes = await prisma.discountType.findMany({ select: { id: true, name: true } });
        
        // Delete existing discounts and create new ones
        await prisma.productDiscount.deleteMany({
          where: { productId: id }
        });
        
        if (Array.isArray(discounts) && discounts.length > 0) {
          const resolvedDiscounts = [];
          
          for (const discount of discounts) {
            let discountType = null;
            
            // Try by ID first
            if (discount.discountTypeId) {
              discountType = await prisma.discountType.findUnique({
                where: { id: discount.discountTypeId }
              });
            }
            
            // If not found by ID, try by name
            if (!discountType && discount.discountTypeName) {
              discountType = await prisma.discountType.findUnique({
                where: { name: discount.discountTypeName }
              });
            }
            
            // If still not found, try using discountTypeId as name (for convenience)
            if (!discountType && discount.discountTypeId && !discount.discountTypeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              discountType = await prisma.discountType.findUnique({
                where: { name: discount.discountTypeId }
              });
            }
            
            if (!discountType) {
              return res.status(404).json({ 
                message: "Discount type not found",
                providedDiscountTypeId: discount.discountTypeId,
                providedDiscountTypeName: discount.discountTypeName,
                hint: "You can use either discountTypeId (UUID) or discountTypeName (string like 'Normal', 'Member', etc.)",
                availableDiscountTypes: allDiscountTypes.map(dt => ({ id: dt.id, name: dt.name }))
              });
            }
            
            // Handle date parsing - only set dates if they are valid strings
            let startDate = null;
            let endDate = null;
            
            if (discount.startDate && discount.startDate.trim() !== "") {
              const parsedStartDate = new Date(discount.startDate);
              if (!isNaN(parsedStartDate.getTime())) {
                startDate = parsedStartDate;
              }
            }
            
            if (discount.endDate && discount.endDate.trim() !== "") {
              const parsedEndDate = new Date(discount.endDate);
              if (!isNaN(parsedEndDate.getTime())) {
                endDate = parsedEndDate;
              }
            }
            
            resolvedDiscounts.push({
              discountTypeId: discountType.id,
              discountPercentage: parseFloat(discount.discountPercentage.toString()),
              startDate: startDate,
              endDate: endDate,
              isActive: discount.isActive !== undefined ? discount.isActive : true
            });
          }
          
          if (resolvedDiscounts.length > 0) {
            updateData.discounts = {
              create: resolvedDiscounts
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
              role: true
            }
          },
          variations: {
            include: {
              photos: true
            }
          },
          discounts: {
            include: {
              discountType: true
            }
          }
        }
      });

      res.status(200).json({ 
        message: "Product updated successfully",
        product: updatedProduct
      });
    } catch (error: any) {
      console.error("Update product error:", error);
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          message: "Product with this IMS code already exists",
          error: error.message 
        });
      }
      res.status(500).json({ message: "Error updating product", error: error.message });
    }
  }

  // Delete product (admin and superAdmin only)
  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      await prisma.product.delete({
        where: { id }
      });

      res.status(200).json({ 
        message: "Product deleted successfully"
      });
    } catch (error: any) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Error deleting product", error: error.message });
    }
  }

  // Get all categories (helper endpoint for dropdown/selection)
  async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.status(200).json({
        message: "Categories fetched successfully",
        categories,
        count: categories.length
      });
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Error fetching categories", error: error.message });
    }
  }

  // Get all discount types (helper endpoint for dropdown/selection)
  async getAllDiscountTypes(req: Request, res: Response) {
    try {
      const discountTypes = await prisma.discountType.findMany({
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.status(200).json({
        message: "Discount types fetched successfully",
        discountTypes,
        count: discountTypes.length
      });
    } catch (error: any) {
      console.error("Get discount types error:", error);
      res.status(500).json({ message: "Error fetching discount types", error: error.message });
    }
  }
}

export default new ProductController();
