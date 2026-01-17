import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import * as path from "path";

// Load environment variables from project root
// seed.ts is in apps/api/prisma/, so we go up 3 levels to reach project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Get superAdmin credentials from environment variables
  const superAdminUsername = process.env.SUPERADMIN_USERNAME;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!superAdminUsername || !superAdminPassword) {
    throw new Error(
      "❌ Missing required environment variables: SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set in .env file",
    );
  }

  // ============================================
  // 1. CREATE SUPER ADMIN USER
  // ============================================
  let superAdmin = await prisma.user.findUnique({
    where: { username: superAdminUsername },
  });

  if (superAdmin) {
    console.log(
      `⚠️  User "${superAdminUsername}" already exists. Using existing user.`,
    );
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    superAdmin = await prisma.user.create({
      data: {
        username: superAdminUsername,
        password: hashedPassword,
        role: "superAdmin",
      },
    });
    console.log("✅ Created superAdmin user");
    console.log(`   Username: ${superAdmin.username}`);
    console.log(`   Role: ${superAdmin.role}`);
  }

  // ============================================
  // 2. CREATE DISCOUNT TYPES
  // ============================================
  const discountTypeNames = ["Normal", "Special", "Member", "Wholesale"];
  const discountTypeDescriptions: Record<string, string> = {
    Normal: "Regular discount for all customers",
    Special: "Special promotional discount",
    Member: "Discount for registered members",
    Wholesale: "Bulk purchase discount",
  };

  const discountTypes: Record<string, { id: string }> = {};

  for (const name of discountTypeNames) {
    let discountType = await prisma.discountType.findUnique({
      where: { name },
    });

    if (!discountType) {
      discountType = await prisma.discountType.create({
        data: {
          name,
          description: discountTypeDescriptions[name] || null,
        },
      });
      console.log(`✅ Created discount type: ${name}`);
    } else {
      console.log(`⚠️  Discount type "${name}" already exists. Skipping.`);
    }
    discountTypes[name] = { id: discountType.id };
  }

  // ============================================
  // 3. CREATE CATEGORIES
  // ============================================
  const categoriesData = [
    { name: "Electronics", description: "Electronic devices and gadgets" },
    { name: "Furniture", description: "Home and office furniture" },
    { name: "Clothing", description: "Apparel and fashion items" },
    { name: "Sports", description: "Sports equipment and accessories" },
    { name: "Books", description: "Books, magazines, and publications" },
  ];

  const categories: Record<string, { id: string }> = {};

  for (const cat of categoriesData) {
    let category = await prisma.category.findUnique({
      where: { name: cat.name },
    });

    if (!category) {
      category = await prisma.category.create({
        data: cat,
      });
      console.log(`✅ Created category: ${cat.name}`);
    } else {
      console.log(`⚠️  Category "${cat.name}" already exists. Skipping.`);
    }
    categories[cat.name] = { id: category.id };
  }

  // ============================================
  // 4. CREATE PRODUCTS WITH VARIATIONS
  // ============================================

  // Product templates for bulk generation
  const productTemplates = {
    Electronics: [
      {
        namePrefix: "Wireless Bluetooth Headphones",
        baseCost: 45,
        baseMrp: 89.99,
        weight: 0.25,
      },
      {
        namePrefix: "Smart Watch",
        baseCost: 120,
        baseMrp: 249.99,
        weight: 0.08,
      },
      {
        namePrefix: "Portable Power Bank",
        baseCost: 25,
        baseMrp: 49.99,
        weight: 0.4,
      },
      {
        namePrefix: "Wireless Earbuds",
        baseCost: 30,
        baseMrp: 79.99,
        weight: 0.05,
      },
      {
        namePrefix: "Bluetooth Speaker",
        baseCost: 35,
        baseMrp: 89.99,
        weight: 0.6,
      },
      { namePrefix: "USB-C Hub", baseCost: 20, baseMrp: 59.99, weight: 0.15 },
      {
        namePrefix: "Mechanical Keyboard",
        baseCost: 55,
        baseMrp: 129.99,
        weight: 0.9,
      },
      {
        namePrefix: "Gaming Mouse",
        baseCost: 25,
        baseMrp: 69.99,
        weight: 0.12,
      },
      { namePrefix: "Webcam HD", baseCost: 40, baseMrp: 99.99, weight: 0.2 },
      {
        namePrefix: "Monitor Stand",
        baseCost: 30,
        baseMrp: 79.99,
        weight: 2.5,
      },
      { namePrefix: "Laptop Stand", baseCost: 25, baseMrp: 59.99, weight: 1.2 },
      {
        namePrefix: "Phone Charger Fast",
        baseCost: 15,
        baseMrp: 39.99,
        weight: 0.1,
      },
      {
        namePrefix: "Smart Plug WiFi",
        baseCost: 12,
        baseMrp: 29.99,
        weight: 0.08,
      },
      {
        namePrefix: "LED Desk Lamp",
        baseCost: 22,
        baseMrp: 54.99,
        weight: 0.8,
      },
      {
        namePrefix: "Wireless Charging Pad",
        baseCost: 18,
        baseMrp: 44.99,
        weight: 0.15,
      },
    ],
    Furniture: [
      {
        namePrefix: "Ergonomic Office Chair",
        baseCost: 150,
        baseMrp: 349.99,
        weight: 15,
        length: 65,
        breadth: 65,
        height: 120,
      },
      {
        namePrefix: "Standing Desk",
        baseCost: 280,
        baseMrp: 599.99,
        weight: 35,
        length: 140,
        breadth: 70,
        height: 120,
      },
      {
        namePrefix: "Bookshelf Modern",
        baseCost: 80,
        baseMrp: 189.99,
        weight: 20,
        length: 80,
        breadth: 30,
        height: 180,
      },
      {
        namePrefix: "Coffee Table",
        baseCost: 60,
        baseMrp: 149.99,
        weight: 12,
        length: 100,
        breadth: 50,
        height: 45,
      },
      {
        namePrefix: "Storage Cabinet",
        baseCost: 120,
        baseMrp: 279.99,
        weight: 25,
        length: 80,
        breadth: 40,
        height: 150,
      },
      {
        namePrefix: "Filing Cabinet",
        baseCost: 90,
        baseMrp: 199.99,
        weight: 18,
        length: 40,
        breadth: 50,
        height: 70,
      },
      {
        namePrefix: "Side Table",
        baseCost: 35,
        baseMrp: 89.99,
        weight: 5,
        length: 45,
        breadth: 45,
        height: 55,
      },
      {
        namePrefix: "TV Stand",
        baseCost: 100,
        baseMrp: 229.99,
        weight: 22,
        length: 150,
        breadth: 40,
        height: 50,
      },
      {
        namePrefix: "Dining Chair",
        baseCost: 45,
        baseMrp: 109.99,
        weight: 6,
        length: 45,
        breadth: 45,
        height: 90,
      },
      {
        namePrefix: "Bar Stool",
        baseCost: 55,
        baseMrp: 129.99,
        weight: 7,
        length: 40,
        breadth: 40,
        height: 75,
      },
    ],
    Clothing: [
      {
        namePrefix: "Premium Cotton T-Shirt",
        baseCost: 8,
        baseMrp: 29.99,
        weight: 0.2,
      },
      { namePrefix: "Denim Jacket", baseCost: 35, baseMrp: 89.99, weight: 0.8 },
      {
        namePrefix: "Slim Fit Jeans",
        baseCost: 25,
        baseMrp: 69.99,
        weight: 0.5,
      },
      {
        namePrefix: "Casual Hoodie",
        baseCost: 20,
        baseMrp: 59.99,
        weight: 0.6,
      },
      { namePrefix: "Polo Shirt", baseCost: 15, baseMrp: 44.99, weight: 0.25 },
      { namePrefix: "Chino Pants", baseCost: 22, baseMrp: 64.99, weight: 0.4 },
      {
        namePrefix: "Winter Jacket",
        baseCost: 60,
        baseMrp: 149.99,
        weight: 1.2,
      },
      {
        namePrefix: "Running Shorts",
        baseCost: 12,
        baseMrp: 34.99,
        weight: 0.15,
      },
      { namePrefix: "Formal Shirt", baseCost: 25, baseMrp: 69.99, weight: 0.3 },
      {
        namePrefix: "Cardigan Sweater",
        baseCost: 30,
        baseMrp: 79.99,
        weight: 0.5,
      },
      {
        namePrefix: "Athletic Socks Pack",
        baseCost: 8,
        baseMrp: 24.99,
        weight: 0.15,
      },
      { namePrefix: "Beanie Hat", baseCost: 10, baseMrp: 29.99, weight: 0.1 },
    ],
    Sports: [
      {
        namePrefix: "Yoga Mat Premium",
        baseCost: 15,
        baseMrp: 39.99,
        weight: 1.2,
        length: 183,
        breadth: 61,
        height: 0.6,
      },
      {
        namePrefix: "Resistance Bands Set",
        baseCost: 12,
        baseMrp: 34.99,
        weight: 0.5,
      },
      { namePrefix: "Dumbbell Set", baseCost: 45, baseMrp: 99.99, weight: 10 },
      { namePrefix: "Jump Rope Pro", baseCost: 8, baseMrp: 24.99, weight: 0.3 },
      { namePrefix: "Foam Roller", baseCost: 15, baseMrp: 39.99, weight: 0.8 },
      { namePrefix: "Kettlebell", baseCost: 25, baseMrp: 59.99, weight: 8 },
      { namePrefix: "Pull-Up Bar", baseCost: 20, baseMrp: 49.99, weight: 2 },
      {
        namePrefix: "Ab Roller Wheel",
        baseCost: 10,
        baseMrp: 29.99,
        weight: 0.5,
      },
      {
        namePrefix: "Boxing Gloves",
        baseCost: 25,
        baseMrp: 64.99,
        weight: 0.6,
      },
      {
        namePrefix: "Tennis Racket",
        baseCost: 35,
        baseMrp: 89.99,
        weight: 0.3,
      },
      { namePrefix: "Basketball", baseCost: 18, baseMrp: 44.99, weight: 0.6 },
      { namePrefix: "Soccer Ball", baseCost: 15, baseMrp: 39.99, weight: 0.45 },
    ],
    Books: [
      {
        namePrefix: "The Art of Programming",
        baseCost: 20,
        baseMrp: 49.99,
        weight: 0.8,
        length: 23,
        breadth: 15,
        height: 3,
      },
      {
        namePrefix: "Data Structures Handbook",
        baseCost: 25,
        baseMrp: 59.99,
        weight: 0.9,
        length: 24,
        breadth: 16,
        height: 3.5,
      },
      {
        namePrefix: "Machine Learning Guide",
        baseCost: 30,
        baseMrp: 69.99,
        weight: 1,
        length: 25,
        breadth: 17,
        height: 4,
      },
      {
        namePrefix: "Web Development Mastery",
        baseCost: 22,
        baseMrp: 54.99,
        weight: 0.7,
        length: 23,
        breadth: 15,
        height: 2.5,
      },
      {
        namePrefix: "Database Design Patterns",
        baseCost: 28,
        baseMrp: 64.99,
        weight: 0.85,
        length: 24,
        breadth: 16,
        height: 3,
      },
      {
        namePrefix: "Cloud Computing Essentials",
        baseCost: 26,
        baseMrp: 59.99,
        weight: 0.75,
        length: 23,
        breadth: 15,
        height: 2.8,
      },
      {
        namePrefix: "DevOps Practices",
        baseCost: 24,
        baseMrp: 57.99,
        weight: 0.7,
        length: 23,
        breadth: 15,
        height: 2.5,
      },
      {
        namePrefix: "UI/UX Design Principles",
        baseCost: 22,
        baseMrp: 52.99,
        weight: 0.65,
        length: 22,
        breadth: 14,
        height: 2.2,
      },
      {
        namePrefix: "Cybersecurity Fundamentals",
        baseCost: 27,
        baseMrp: 62.99,
        weight: 0.8,
        length: 24,
        breadth: 16,
        height: 3,
      },
      {
        namePrefix: "API Design Patterns",
        baseCost: 23,
        baseMrp: 55.99,
        weight: 0.7,
        length: 23,
        breadth: 15,
        height: 2.5,
      },
    ],
  };

  // Color variations by category
  const colorVariations: Record<string, string[]> = {
    Electronics: ["Black", "White", "Silver", "Space Gray", "Blue", "Red"],
    Furniture: ["Black", "White", "Walnut", "Oak", "Gray", "Espresso"],
    Clothing: ["Black", "White", "Navy Blue", "Gray", "Red", "Green", "Beige"],
    Sports: ["Black", "Blue", "Red", "Green", "Purple", "Orange", "Pink"],
    Books: ["Hardcover", "Paperback"],
  };

  // Discount configurations
  const discountConfigs = [
    [{ type: "Normal", percentage: 10 }],
    [
      { type: "Normal", percentage: 10 },
      { type: "Member", percentage: 15 },
    ],
    [
      { type: "Normal", percentage: 8 },
      { type: "Special", percentage: 20 },
    ],
    [
      { type: "Normal", percentage: 10 },
      { type: "Member", percentage: 20 },
      { type: "Wholesale", percentage: 30 },
    ],
    [{ type: "Special", percentage: 25 }],
    [{ type: "Wholesale", percentage: 20 }],
    [
      { type: "Member", percentage: 15 },
      { type: "Wholesale", percentage: 25 },
    ],
  ];

  // Product name modifiers for variety
  const modifiers = [
    "Pro",
    "Elite",
    "Classic",
    "Premium",
    "Ultra",
    "Lite",
    "Plus",
    "Max",
    "Mini",
    "Standard",
  ];

  // Generate products
  const productsData: Array<{
    imsCode: string;
    name: string;
    category: string;
    description: string;
    costPrice: number;
    mrp: number;
    weight?: number;
    length?: number;
    breadth?: number;
    height?: number;
    variations: Array<{ color: string; stockQuantity: number }>;
    discounts: Array<{ type: string; percentage: number }>;
  }> = [];

  // Category codes for IMS
  const categoryCodes: Record<string, string> = {
    Electronics: "ELEC",
    Furniture: "FURN",
    Clothing: "CLTH",
    Sports: "SPRT",
    Books: "BOOK",
  };

  let productCounter: Record<string, number> = {
    Electronics: 0,
    Furniture: 0,
    Clothing: 0,
    Sports: 0,
    Books: 0,
  };

  // Generate 75 products across categories
  for (const [category, templates] of Object.entries(productTemplates)) {
    const colors = colorVariations[category] || ["Default"];

    for (const template of templates) {
      productCounter[category]++;
      const counter = productCounter[category];
      const modifier = modifiers[(counter - 1) % modifiers.length];

      // Create unique product name with modifier
      const productName = `${template.namePrefix} ${modifier}`;
      const imsCode = `${categoryCodes[category]}-${String(counter).padStart(3, "0")}`;

      // Random price variation (±10%)
      const priceVariation = 0.9 + Math.random() * 0.2;
      const costPrice =
        Math.round(template.baseCost * priceVariation * 100) / 100;
      const mrp = Math.round(template.baseMrp * priceVariation * 100) / 100;

      // Select 2-4 random colors for variations
      const numVariations = Math.min(
        colors.length,
        2 + Math.floor(Math.random() * 3),
      );
      const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
      const selectedColors = shuffledColors.slice(0, numVariations);

      // Random stock quantities
      const variations = selectedColors.map((color) => ({
        color,
        stockQuantity: 10 + Math.floor(Math.random() * 90),
      }));

      // Select random discount configuration
      const discounts =
        discountConfigs[Math.floor(Math.random() * discountConfigs.length)] ||
        [];

      productsData.push({
        imsCode,
        name: productName,
        category,
        description: `High-quality ${productName.toLowerCase()} - ${category.toLowerCase()} category`,
        costPrice,
        mrp,
        weight: template.weight,
        length: "length" in template ? template.length : undefined,
        breadth: "breadth" in template ? template.breadth : undefined,
        height: "height" in template ? template.height : undefined,
        variations,
        discounts,
      });
    }
  }

  for (const productData of productsData) {
    // Check if product already exists
    const existingProduct = await prisma.product.findUnique({
      where: { imsCode: productData.imsCode },
    });

    if (existingProduct) {
      console.log(
        `⚠️  Product "${productData.name}" (${productData.imsCode}) already exists. Skipping.`,
      );
      continue;
    }

    // Create product with variations and discounts
    const product = await prisma.product.create({
      data: {
        imsCode: productData.imsCode,
        name: productData.name,
        categoryId: categories[productData.category].id,
        description: productData.description,
        costPrice: productData.costPrice,
        mrp: productData.mrp,
        length: productData.length,
        breadth: productData.breadth,
        height: productData.height,
        weight: productData.weight,
        createdById: superAdmin.id,
        variations: {
          create: productData.variations.map((v) => ({
            color: v.color,
            stockQuantity: v.stockQuantity,
          })),
        },
        discounts: {
          create: productData.discounts.map((d) => ({
            discountTypeId: discountTypes[d.type].id,
            discountPercentage: d.percentage,
            isActive: true,
          })),
        },
      },
      include: {
        variations: true,
        discounts: true,
      },
    });

    console.log(
      `✅ Created product: ${product.name} (${product.imsCode}) with ${product.variations.length} variations`,
    );
  }

  console.log("\n🎉 Seeding completed successfully!");
  console.log("📝 You can now log in with the credentials from your .env file");
  console.log("📦 Sample products have been added to the database");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
