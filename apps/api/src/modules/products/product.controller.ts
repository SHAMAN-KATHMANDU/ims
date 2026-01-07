import { Request, Response } from "express";
import Product from "@/models/productModel";

class ProductController {
  // Create product (admin and superAdmin only)
  async createProduct(req: Request, res: Response) {
    try {
      const { name, description, price } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Product name is required" });
      }

      const product = await Product.create({
        data: {
          name,
          description: description || null,
          price: price ? parseFloat(price) : null
        }
      });

      res.status(201).json({ 
        message: "Product created successfully",
        product
      });
    } catch (error: any) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Error creating product", error: error.message });
    }
  }

  // Get all products (all authenticated users can view)
  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await Product.findMany({
        orderBy: {
          createdAt: 'desc'
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

      const product = await Product.findUnique({
        where: { id }
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
      const { name, description, price } = req.body;

      // Check if product exists
      const existingProduct = await Product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Prepare update data
      const updateData: any = {};
      
      if (name !== undefined) {
        updateData.name = name;
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }

      if (price !== undefined) {
        updateData.price = price ? parseFloat(price) : null;
      }

      const updatedProduct = await Product.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({ 
        message: "Product updated successfully",
        product: updatedProduct
      });
    } catch (error: any) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Error updating product", error: error.message });
    }
  }

  // Delete product (admin and superAdmin only)
  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await Product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      await Product.delete({
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
}

export default new ProductController();
