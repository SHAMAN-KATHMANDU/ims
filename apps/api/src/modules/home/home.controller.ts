import { Request, Response } from "express";
import Product from "@/models/productModel";

class HomeController {
  // Get home data (all authenticated users)
  async getHome(req: Request, res: Response) {
    try {
      // Get featured/recent products for home page
      const featuredProducts = await Product.findMany({
        take: 6,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get total products count
      const totalProducts = await Product.count();

      res.status(200).json({
        message: "Home data fetched successfully",
        data: {
          featuredProducts,
          totalProducts,
          welcomeMessage: `Welcome, ${req.user?.username || 'User'}!`
        }
      });
    } catch (error: any) {
      console.error("Get home error:", error);
      res.status(500).json({ message: "Error fetching home data", error: error.message });
    }
  }
}

export default new HomeController();

