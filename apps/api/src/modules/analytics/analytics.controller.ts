// import { Request, Response } from "express";
// import Product from "@/models/productModel";
// import User from "@/models/userModel";

// class AnalyticsController {
//   // Get analytics (admin and superAdmin only)
//   async getAnalytics(req: Request, res: Response) {
//     try {
//       // Get total products count
//       const totalProducts = await Product.count();

//       // Get total users count
//       const totalUsers = await User.count();

//       // Get users by role (manually count since groupBy may not be available)
//       const allUsers = await User.findMany({
//         select: {
//           role: true
//         }
//       });

//       const usersByRole = [
//         { role: 'superAdmin', count: allUsers.filter(u => u.role === 'superAdmin').length },
//         { role: 'admin', count: allUsers.filter(u => u.role === 'admin').length },
//         { role: 'user', count: allUsers.filter(u => u.role === 'user').length }
//       ];

//       // Get recent products (last 10)
//       const recentProducts = await Product.findMany({
//         take: 10,
//         orderBy: {
//           createdAt: 'desc'
//         }
//       });

//       // Calculate total value of products (if prices exist)
//       const productsWithPrice = await Product.findMany({
//         where: {
//           price: {
//             not: null
//           }
//         },
//         select: {
//           price: true
//         }
//       });

//       const totalValue = productsWithPrice.reduce((sum, product) => {
//         return sum + (product.price || 0);
//       }, 0);

//       // Get recent users (last 10)
//       const recentUsers = await User.findMany({
//         take: 10,
//         orderBy: {
//           createdAt: 'desc'
//         },
//         select: {
//           id: true,
//           username: true,
//           role: true,
//           createdAt: true
//         }
//       });

//       res.status(200).json({
//         message: "Analytics fetched successfully",
//         analytics: {
//           overview: {
//             totalProducts,
//             totalUsers,
//             totalValue: totalValue.toFixed(2),
//             averageProductPrice: totalProducts > 0 ? (totalValue / totalProducts).toFixed(2) : "0.00"
//           },
//           usersByRole,
//           recentProducts,
//           recentUsers
//         }
//       });
//     } catch (error: any) {
//       console.error("Get analytics error:", error);
//       res.status(500).json({ message: "Error fetching analytics", error: error.message });
//     }
//   }
// }

// export default new AnalyticsController();
