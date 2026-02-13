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
  const discountTypeNames = ["Non-Member", "Member", "Wholesale", "Special"];
  const discountTypeDescriptions: Record<string, string> = {
    "Non-Member": "Regular discount for walk-in / non-member customers",
    Special: "Special product-specific discount with higher priority",
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
  // 3. CREATE VENDORS
  // ============================================
  const vendorsData = [
    {
      name: "Global Electronics Ltd",
      contact: "sales@globalelectronics.com",
      phone: "+977-1-5550001",
      address: "Industrial Area, Kathmandu",
    },
    {
      name: "Comfort Furniture Co",
      contact: "info@comfortfurniture.com",
      phone: "+977-1-5550002",
      address: "Furniture District, Lalitpur",
    },
    {
      name: "Fashion Trends Inc",
      contact: "orders@fashiontrends.com",
      phone: "+977-1-5550003",
      address: "Fashion Street, Kathmandu",
    },
    {
      name: "Sports World Suppliers",
      contact: "sales@sportsworld.com",
      phone: "+977-1-5550004",
      address: "Sports Complex Area, Bhaktapur",
    },
    {
      name: "Book Publishers Nepal",
      contact: "orders@bookpublishers.com",
      phone: "+977-1-5550005",
      address: "Publishing Hub, Kathmandu",
    },
  ];

  const vendors: Record<string, { id: string }> = {};

  for (const vendorData of vendorsData) {
    let vendor = await prisma.vendor.findUnique({
      where: { name: vendorData.name },
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: vendorData,
      });
      console.log(`✅ Created vendor: ${vendorData.name}`);
    } else {
      console.log(`⚠️  Vendor "${vendorData.name}" already exists. Skipping.`);
    }
    vendors[vendorData.name] = { id: vendor.id };
  }

  // Map categories to vendors
  const categoryVendorMap: Record<string, string> = {
    Electronics: "Global Electronics Ltd",
    Furniture: "Comfort Furniture Co",
    Clothing: "Fashion Trends Inc",
    Sports: "Sports World Suppliers",
    Books: "Book Publishers Nepal",
  };

  // ============================================
  // 4. CREATE CATEGORIES
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
  // 4b. CREATE SUBCATEGORIES
  // ============================================
  const subCategoriesConfig: Record<string, string[]> = {
    Electronics: [
      "Headphones",
      "Wearables",
      "Chargers",
      "Accessories",
      "Speakers",
    ],
    Furniture: ["Chairs", "Desks", "Storage", "Tables"],
    Clothing: ["T-Shirts", "Jackets", "Pants", "Shoes"],
    Sports: ["Fitness", "Balls", "Outdoor"],
    Books: ["Programming", "Databases", "Web", "Cloud"],
  };

  const subCategories: Record<
    string,
    { id: string; name: string; categoryName: string }
  > = {};

  for (const [catName, subs] of Object.entries(subCategoriesConfig)) {
    const category = categories[catName];
    if (!category) continue;

    for (const subName of subs) {
      let sub = await prisma.subCategory.findFirst({
        where: {
          name: subName,
          categoryId: category.id,
        },
      });

      if (!sub) {
        sub = await prisma.subCategory.create({
          data: {
            name: subName,
            categoryId: category.id,
          },
        });
        console.log(`✅ Created subcategory: ${catName} / ${subName}`);
      } else {
        console.log(
          `⚠️  Subcategory "${subName}" for "${catName}" already exists. Skipping.`,
        );
      }

      subCategories[`${catName}:${subName}`] = {
        id: sub.id,
        name: sub.name,
        categoryName: catName,
      };
    }
  }

  // ============================================
  // 5. CREATE PRODUCTS WITH VARIATIONS
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
    [{ type: "Non-Member", percentage: 10 }],
    [
      { type: "Non-Member", percentage: 10 },
      { type: "Member", percentage: 15 },
    ],
    [
      { type: "Non-Member", percentage: 8 },
      { type: "Special", percentage: 20 },
    ],
    [
      { type: "Non-Member", percentage: 10 },
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
    subCategoryName?: string;
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

      // Pick a subcategory for this product if available
      const subConfig = subCategoriesConfig[category] || [];
      const subCategoryName =
        subConfig.length > 0
          ? subConfig[(counter - 1) % subConfig.length]
          : undefined;

      productsData.push({
        imsCode,
        name: productName,
        category,
        subCategoryName,
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

    // Get vendor for this category
    const vendorName = categoryVendorMap[productData.category];
    const vendorId = vendorName ? vendors[vendorName]?.id : null;

    // Resolve subcategory if configured
    let subCategoryId: string | null = null;
    if (productData.subCategoryName) {
      const key = `${productData.category}:${productData.subCategoryName}`;
      const sub = subCategories[key];
      if (sub) {
        subCategoryId = sub.id;
      }
    }

    // Create product with variations and discounts
    const product = await prisma.product.create({
      data: {
        imsCode: productData.imsCode,
        name: productData.name,
        categoryId: categories[productData.category].id,
        subCategory: productData.subCategoryName || null,
        subCategoryId,
        description: productData.description,
        costPrice: productData.costPrice,
        mrp: productData.mrp,
        finalSp: productData.mrp, // Default final SP to MRP
        vendorId: vendorId || null,
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
            valueType: "PERCENTAGE",
            value: d.percentage,
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

  // ============================================
  // 6. CREATE DEFAULT LOCATIONS (WAREHOUSE & SHOWROOMS)
  // ============================================
  const locationsData = [
    {
      name: "Main Warehouse",
      type: "WAREHOUSE" as const,
      address: "Central Distribution Center, Industrial Area",
    },
    {
      name: "Showroom A",
      type: "SHOWROOM" as const,
      address: "Downtown Shopping Complex, Floor 1",
    },
    {
      name: "Showroom B",
      type: "SHOWROOM" as const,
      address: "Mall of Commerce, Unit 25",
    },
  ];

  const locations: Record<string, { id: string }> = {};

  for (const loc of locationsData) {
    let location = await prisma.location.findUnique({
      where: { name: loc.name },
    });

    if (!location) {
      location = await prisma.location.create({
        data: {
          ...loc,
          isDefaultWarehouse: loc.name === "Main Warehouse",
        } as any,
      });
      console.log(`✅ Created location: ${loc.name} (${loc.type})`);
    } else {
      const locWithDefault = location as { isDefaultWarehouse?: boolean };
      if (
        loc.name === "Main Warehouse" &&
        locWithDefault.isDefaultWarehouse !== true
      ) {
        await prisma.location.update({
          where: { id: location.id },
          data: { isDefaultWarehouse: true } as any,
        });
        console.log(`✅ Set Main Warehouse as default warehouse`);
      }
      console.log(`⚠️  Location "${loc.name}" already exists. Skipping.`);
    }
    locations[loc.name] = { id: location.id };
  }

  // ============================================
  // 6b. ADD VARIATION PHOTOS (optional – for demo)
  // ============================================
  const variationsWithoutPhotos = await prisma.productVariation.findMany({
    where: { photos: { none: {} } },
    select: { id: true },
    take: 30,
  });

  for (const v of variationsWithoutPhotos) {
    await prisma.variationPhoto.create({
      data: {
        variationId: v.id,
        photoUrl: `https://picsum.photos/seed/${v.id}/400/300`,
        isPrimary: true,
      },
    });
  }
  if (variationsWithoutPhotos.length > 0) {
    console.log(
      `✅ Added primary photo for ${variationsWithoutPhotos.length} variations`,
    );
  }

  // ============================================
  // 6c. ADD SUB-VARIATIONS (e.g. S, M, L) FOR SOME CLOTHING PRODUCTS
  // ============================================
  const mainWarehouseForSubVars = locations["Main Warehouse"];
  const clothingProducts = await prisma.product.findMany({
    where: { category: { name: "Clothing" } },
    include: { variations: { take: 1 } },
    take: 8,
  });

  const sizeNames = ["S", "M", "L", "XL"];
  let subVariantCount = 0;

  for (const product of clothingProducts) {
    const variation = product.variations[0];
    if (!variation) continue;

    const existingSubs = await (prisma as any).productSubVariation.count({
      where: { variationId: variation.id },
    });
    if (existingSubs > 0) continue;

    for (const size of sizeNames) {
      await (prisma as any).productSubVariation.create({
        data: { variationId: variation.id, name: size },
      });
      subVariantCount++;
    }

    if (mainWarehouseForSubVars) {
      for (const size of sizeNames) {
        const sub = await (prisma as any).productSubVariation.findUnique({
          where: {
            variationId_name: { variationId: variation.id, name: size },
          },
        });
        if (sub) {
          const qty = 5 + Math.floor(Math.random() * 15);
          await (prisma.locationInventory as any).upsert({
            where: {
              locationId_variationId_subVariationId: {
                locationId: mainWarehouseForSubVars.id,
                variationId: variation.id,
                subVariationId: sub.id,
              },
            },
            create: {
              locationId: mainWarehouseForSubVars.id,
              variationId: variation.id,
              subVariationId: sub.id,
              quantity: qty,
            },
            update: { quantity: { increment: qty } },
          });
        }
      }
    }
  }
  if (subVariantCount > 0) {
    console.log(
      `✅ Created ${subVariantCount} sub-variants (sizes) for ${clothingProducts.length} clothing products with warehouse stock`,
    );
  }

  // ============================================
  // 7. MIGRATE STOCK TO LOCATION INVENTORY
  // ============================================
  // Get the main warehouse location
  const mainWarehouse = locations["Main Warehouse"];

  if (mainWarehouse) {
    // Get all product variations
    const allVariations = await prisma.productVariation.findMany({
      select: { id: true, stockQuantity: true },
    });

    for (const variation of allVariations) {
      // Check if inventory record already exists (variation-level, no sub-variant)
      const existingInventory = await prisma.locationInventory.findFirst({
        where: {
          locationId: mainWarehouse.id,
          variationId: variation.id,
          subVariationId: null,
        } as any,
      });

      if (!existingInventory && variation.stockQuantity > 0) {
        // Create inventory record for warehouse with current stock (variation-level)
        await prisma.locationInventory.create({
          data: {
            locationId: mainWarehouse.id,
            variationId: variation.id,
            subVariationId: null,
            quantity: variation.stockQuantity,
          } as any,
        });
      }
    }
    console.log(
      `✅ Migrated ${allVariations.length} variation stocks to Main Warehouse inventory`,
    );
  }

  // ============================================
  // 8. CREATE SAMPLE TRANSFERS BETWEEN LOCATIONS
  // ============================================
  const showroomA = locations["Showroom A"];
  const showroomB = locations["Showroom B"];

  // Only seed transfers if we have the required locations
  if (mainWarehouse && showroomA && showroomB) {
    const existingTransfers = await prisma.transfer.count();

    if (existingTransfers === 0) {
      // Get some variations from warehouse inventory to use in transfers
      const warehouseInventoryForTransfers =
        await prisma.locationInventory.findMany({
          where: { locationId: mainWarehouse.id, quantity: { gt: 30 } },
          select: {
            variationId: true,
            quantity: true,
          },
          take: 15,
        });

      // Helper to generate transfer code
      function generateTransferCode(index: number): string {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
        const random = String(index).padStart(3, "0");
        return `TR-${dateStr}-${random}`;
      }

      let transferIndex = 1;

      // Create a few example transfers:
      //  - Warehouse -> Showroom A (COMPLETED)
      //  - Warehouse -> Showroom B (COMPLETED)
      //  - Showroom A -> Showroom B (PENDING)
      const transferDefinitions: Array<{
        fromId: string;
        toId: string;
        status: "PENDING" | "COMPLETED";
        note: string;
      }> = [
        {
          fromId: mainWarehouse.id,
          toId: showroomA.id,
          status: "COMPLETED",
          note: "Initial stock allocation to Showroom A",
        },
        {
          fromId: mainWarehouse.id,
          toId: showroomB.id,
          status: "COMPLETED",
          note: "Initial stock allocation to Showroom B",
        },
        {
          fromId: showroomA.id,
          toId: showroomB.id,
          status: "PENDING",
          note: "Requested inter-showroom transfer",
        },
      ];

      for (const def of transferDefinitions) {
        // Pick 3–5 random variations for this transfer
        const shuffled = [...warehouseInventoryForTransfers].sort(
          () => Math.random() - 0.5,
        );
        const itemsForTransfer = shuffled.slice(
          0,
          3 + Math.floor(Math.random() * 3),
        );

        if (itemsForTransfer.length === 0) continue;

        const transfer = await prisma.transfer.create({
          data: {
            transferCode: generateTransferCode(transferIndex++),
            fromLocationId: def.fromId,
            toLocationId: def.toId,
            status: def.status,
            notes: def.note,
            createdById: superAdmin.id,
            approvedById: def.status === "COMPLETED" ? superAdmin.id : null,
            approvedAt: def.status === "COMPLETED" ? new Date() : null,
            completedAt: def.status === "COMPLETED" ? new Date() : null,
            items: {
              create: itemsForTransfer.map((inv) => ({
                variationId: inv.variationId,
                // Move up to 10 units but never more than half the warehouse stock
                quantity: Math.max(
                  1,
                  Math.min(10, Math.floor(inv.quantity / 2)),
                ),
              })),
            },
          },
        });

        await prisma.transferLog.create({
          data: {
            transferId: transfer.id,
            action: def.status === "COMPLETED" ? "COMPLETED" : "CREATED",
            details: {
              seeded: true,
              note: def.note,
            },
            userId: superAdmin.id,
          },
        });
      }

      console.log("✅ Created sample transfers between locations");
    } else {
      console.log("⚠️  Transfers already exist. Skipping transfer seeding.");
    }
  }

  // ============================================
  // 9. CREATE SAMPLE MEMBERS (CUSTOMERS)
  // ============================================
  const membersData = [
    {
      phone: "9841000001",
      name: "Rajesh Sharma",
      email: "rajesh.sharma@email.com",
      notes: "VIP customer",
      gender: "Male",
      age: 45,
      address: "Thamel, Kathmandu",
      birthday: new Date("1978-05-15"),
      memberStatus: "VIP" as const,
    },
    {
      phone: "9841000002",
      name: "Sunita Patel",
      email: "sunita.p@email.com",
      gender: "Female",
      age: 32,
      address: "Patan, Lalitpur",
      birthday: new Date("1991-08-22"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000003",
      name: "Amit Kumar",
      email: "amit.kumar@email.com",
      gender: "Male",
      age: 28,
      address: "Baneshwor, Kathmandu",
      birthday: new Date("1995-11-10"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000004",
      name: "Priya Singh",
      email: "priya.singh@email.com",
      notes: "Corporate buyer",
      gender: "Female",
      age: 35,
      address: "New Road, Kathmandu",
      birthday: new Date("1988-03-18"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000005",
      name: "Bikash Thapa",
      gender: "Male",
      age: 40,
      address: "Koteshwor, Kathmandu",
      birthday: new Date("1983-07-25"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000006",
      name: "Anita Gurung",
      email: "anita.g@email.com",
      gender: "Female",
      age: 29,
      address: "Bhaktapur",
      birthday: new Date("1994-12-05"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000007",
      name: "Ramesh Adhikari",
      email: "ramesh.a@email.com",
      gender: "Male",
      age: 38,
      address: "Kalimati, Kathmandu",
      birthday: new Date("1985-09-30"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000008",
      name: "Sita Rai",
      gender: "Female",
      age: 26,
      address: "Jawalakhel, Lalitpur",
      birthday: new Date("1997-04-12"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000009",
      name: "Krishna Bhattarai",
      email: "krishna.b@email.com",
      notes: "Wholesale inquiries",
      gender: "Male",
      age: 42,
      address: "Gongabu, Kathmandu",
      birthday: new Date("1981-06-20"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000010",
      name: "Gita Shrestha",
      email: "gita.shrestha@email.com",
      gender: "Female",
      age: 31,
      address: "Buddhanagar, Kathmandu",
      birthday: new Date("1992-10-08"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000011",
      name: "Hari Prasad",
      email: "hari.p@email.com",
      gender: "Male",
      age: 36,
      address: "Maitidevi, Kathmandu",
      birthday: new Date("1987-02-14"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000012",
      name: "Maya Tamang",
      gender: "Female",
      age: 24,
      address: "Balaju, Kathmandu",
      birthday: new Date("1999-01-28"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000013",
      name: "Prakash Karki",
      email: "prakash.k@email.com",
      gender: "Male",
      age: 33,
      address: "Tahachal, Kathmandu",
      birthday: new Date("1990-09-15"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000014",
      name: "Kamala Devi",
      email: "kamala.d@email.com",
      gender: "Female",
      age: 27,
      address: "Chabahil, Kathmandu",
      birthday: new Date("1996-07-03"),
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000015",
      name: "Suresh Lama",
      notes: "Frequent buyer",
      gender: "Male",
      age: 39,
      address: "Sankhamul, Kathmandu",
      birthday: new Date("1984-11-19"),
      memberStatus: "ACTIVE" as const,
    },
  ];

  const members: Record<string, { id: string; phone: string }> = {};

  for (const memberData of membersData) {
    let member = await prisma.member.findUnique({
      where: { phone: memberData.phone },
    });

    if (!member) {
      const memberSince = new Date();
      memberSince.setDate(
        memberSince.getDate() - Math.floor(Math.random() * 365),
      ); // Random date in last year

      member = await prisma.member.create({
        data: {
          phone: memberData.phone,
          name: memberData.name || null,
          email: memberData.email || null,
          notes: memberData.notes || null,
          gender: memberData.gender || null,
          age: memberData.age || null,
          address: memberData.address || null,
          birthday: memberData.birthday || null,
          memberStatus: memberData.memberStatus || "ACTIVE",
          memberSince: memberSince,
          totalSales: 0,
        },
      });
      console.log(
        `✅ Created member: ${memberData.name} (${memberData.phone})`,
      );
    } else {
      console.log(`⚠️  Member "${memberData.phone}" already exists. Skipping.`);
    }
    members[memberData.phone] = { id: member.id, phone: member.phone };
  }

  // ============================================
  // 9. CREATE PROMO CODES
  // ============================================
  // Get some products for promo code associations
  const allProducts = await prisma.product.findMany({
    take: 20, // Use first 20 products for promo codes
    select: { id: true },
  });

  const promoCodeData = [
    {
      code: "WELCOME10",
      description: "Welcome discount for new customers",
      valueType: "PERCENTAGE" as const,
      value: 10,
      overrideDiscounts: false,
      allowStacking: true,
      eligibility: "ALL" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      usageLimit: 100,
      isActive: true,
      productIds: allProducts.slice(0, 10).map((p) => p.id), // First 10 products
    },
    {
      code: "MEMBER20",
      description: "Exclusive member discount",
      valueType: "PERCENTAGE" as const,
      value: 20,
      overrideDiscounts: false,
      allowStacking: false,
      eligibility: "MEMBER" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      usageLimit: 50,
      isActive: true,
      productIds: allProducts.slice(5, 15).map((p) => p.id), // Products 5-15
    },
    {
      code: "FLAT500",
      description: "Flat Rs. 500 off on selected items",
      valueType: "FLAT" as const,
      value: 500,
      overrideDiscounts: true,
      allowStacking: false,
      eligibility: "ALL" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      usageLimit: 30,
      isActive: true,
      productIds: allProducts.slice(0, 5).map((p) => p.id), // First 5 products
    },
    {
      code: "SUMMER25",
      description: "Summer sale - 25% off",
      valueType: "PERCENTAGE" as const,
      value: 25,
      overrideDiscounts: false,
      allowStacking: true,
      eligibility: "ALL" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      usageLimit: null, // Unlimited
      isActive: true,
      productIds: allProducts.map((p) => p.id), // All products
    },
  ];

  const promoCodes: Record<string, { id: string }> = {};

  for (const promoData of promoCodeData) {
    let promo = await prisma.promoCode.findUnique({
      where: { code: promoData.code },
    });

    if (!promo) {
      promo = await prisma.promoCode.create({
        data: {
          code: promoData.code,
          description: promoData.description,
          valueType: promoData.valueType,
          value: promoData.value,
          overrideDiscounts: promoData.overrideDiscounts,
          allowStacking: promoData.allowStacking,
          eligibility: promoData.eligibility,
          validFrom: promoData.validFrom,
          validTo: promoData.validTo,
          usageLimit: promoData.usageLimit,
          isActive: promoData.isActive,
          products: {
            create: promoData.productIds.map((productId) => ({
              productId,
            })),
          },
        },
      });
      console.log(
        `✅ Created promo code: ${promoData.code} (${promoData.productIds.length} products)`,
      );
    } else {
      console.log(
        `⚠️  Promo code "${promoData.code}" already exists. Skipping.`,
      );
    }
    promoCodes[promoData.code] = { id: promo.id };
  }

  // ============================================
  // 10. DISTRIBUTE STOCK TO SHOWROOMS
  // ============================================
  // showroomA and showroomB are already declared in section 8

  if (showroomA && showroomB && mainWarehouse) {
    // Get all variations with warehouse inventory
    const warehouseInventory = await prisma.locationInventory.findMany({
      where: { locationId: mainWarehouse.id },
      include: { variation: true },
    });

    let distributedCount = 0;

    for (const inv of warehouseInventory) {
      // Distribute some stock to showrooms (keep most in warehouse)
      const warehouseStock = inv.quantity;
      if (warehouseStock < 20) continue; // Skip if not enough stock

      // Calculate distribution (20-40% to each showroom)
      const toShowroomA = Math.floor(
        warehouseStock * (0.2 + Math.random() * 0.2),
      );
      const toShowroomB = Math.floor(
        warehouseStock * (0.15 + Math.random() * 0.15),
      );

      // Check if showroom inventory already exists (variation-level)
      const existingA = await prisma.locationInventory.findFirst({
        where: {
          locationId: showroomA.id,
          variationId: inv.variationId,
          subVariationId: null,
        } as any,
      });

      const existingB = await prisma.locationInventory.findFirst({
        where: {
          locationId: showroomB.id,
          variationId: inv.variationId,
          subVariationId: null,
        } as any,
      });

      if (!existingA && toShowroomA > 0) {
        await prisma.locationInventory.create({
          data: {
            locationId: showroomA.id,
            variationId: inv.variationId,
            subVariationId: null,
            quantity: toShowroomA,
          } as any,
        });
        distributedCount++;
      }

      if (!existingB && toShowroomB > 0) {
        await prisma.locationInventory.create({
          data: {
            locationId: showroomB.id,
            variationId: inv.variationId,
            subVariationId: null,
            quantity: toShowroomB,
          } as any,
        });
        distributedCount++;
      }
    }

    if (distributedCount > 0) {
      console.log(
        `✅ Distributed stock to showrooms (${distributedCount} inventory records)`,
      );
    }
  }

  // ============================================
  // 11. CREATE SAMPLE SALES
  // ============================================
  // Helper to generate sale code
  function generateSaleCode(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = String(index).padStart(4, "0");
    return `SL-${dateStr}-${random}`;
  }

  // Get showroom inventory for sales
  const showroomAInventory = await prisma.locationInventory.findMany({
    where: { locationId: showroomA?.id, quantity: { gt: 0 } },
    include: {
      variation: {
        include: {
          product: {
            include: {
              discounts: {
                where: { isActive: true },
                include: { discountType: true },
              },
            },
          },
        },
      },
    },
    take: 50,
  });

  const showroomBInventory = await prisma.locationInventory.findMany({
    where: { locationId: showroomB?.id, quantity: { gt: 0 } },
    include: {
      variation: {
        include: {
          product: {
            include: {
              discounts: {
                where: { isActive: true },
                include: { discountType: true },
              },
            },
          },
        },
      },
    },
    take: 50,
  });

  // Check if sales already exist
  const existingSalesCount = await prisma.sale.count();

  if (
    existingSalesCount === 0 &&
    showroomAInventory.length > 0 &&
    showroomBInventory.length > 0
  ) {
    const memberPhones = Object.keys(members);
    let saleIndex = 1;

    // Create 30 sales
    for (let i = 0; i < 30; i++) {
      // Randomly choose showroom
      const isShowroomA = Math.random() > 0.5;
      const locationId = isShowroomA ? showroomA!.id : showroomB!.id;
      const inventory = isShowroomA ? showroomAInventory : showroomBInventory;

      if (inventory.length === 0) continue;

      // Randomly choose if this is a member sale (60% chance)
      const isMemberSale = Math.random() < 0.6;
      const memberPhone = isMemberSale
        ? memberPhones[Math.floor(Math.random() * memberPhones.length)]
        : null;
      const member = memberPhone ? members[memberPhone] : null;

      // Get member discount type
      const memberDiscountType = await prisma.discountType.findUnique({
        where: { name: "Member" },
      });

      // Select 1-4 random items for this sale
      const numItems = 1 + Math.floor(Math.random() * 4);
      const shuffledInventory = [...inventory].sort(() => Math.random() - 0.5);
      const selectedItems = shuffledInventory.slice(0, numItems);

      let subtotal = 0;
      let totalDiscount = 0;
      const saleItems: Array<{
        variationId: string;
        quantity: number;
        unitPrice: number;
        totalMrp: number;
        discountPercent: number;
        discountAmount: number;
        lineTotal: number;
      }> = [];

      for (const item of selectedItems) {
        const quantity = 1 + Math.floor(Math.random() * 3);
        const unitPrice = Number(item.variation.product.mrp);

        // Calculate discount (member discount if available)
        let discountPercent = 0;
        let discountAmount = 0;
        if (isMemberSale && memberDiscountType) {
          const memberDiscount = item.variation.product.discounts.find(
            (d) => d.discountTypeId === memberDiscountType.id,
          );
          if (memberDiscount) {
            if (memberDiscount.valueType === "FLAT") {
              discountAmount = Number(memberDiscount.value);
            } else {
              discountPercent = Number(memberDiscount.value);
            }
          }
        }

        const itemSubtotal = unitPrice * quantity;
        const effectiveDiscount =
          Math.min(
            itemSubtotal,
            discountAmount + itemSubtotal * (discountPercent / 100),
          ) || 0;
        const lineTotal = itemSubtotal - effectiveDiscount;

        subtotal += itemSubtotal;
        totalDiscount += effectiveDiscount;

        saleItems.push({
          variationId: item.variationId,
          quantity,
          unitPrice,
          totalMrp: itemSubtotal,
          discountPercent,
          discountAmount: effectiveDiscount,
          lineTotal,
        });
      }

      const total = subtotal - totalDiscount;

      // Generate payment breakdown (mix of payment methods)
      const paymentMethods: Array<
        "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR"
      > = ["CASH", "CARD", "FONEPAY", "QR"];
      const payments: Array<{
        method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
        amount: number;
      }> = [];

      if (total < 500) {
        // Small amount - single payment method
        payments.push({
          method:
            paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          amount: total,
        });
      } else {
        // Larger amount - split payment
        const numPayments = Math.random() > 0.7 ? 2 : 1; // 30% chance of split payment
        if (numPayments === 2) {
          const firstAmount = Math.floor(total * 0.6);
          payments.push({
            method: "CARD",
            amount: firstAmount,
          });
          payments.push({
            method: "CASH",
            amount: total - firstAmount,
          });
        } else {
          payments.push({
            method:
              paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            amount: total,
          });
        }
      }

      // Create sale with random date in last 30 days
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));
      saleDate.setHours(9 + Math.floor(Math.random() * 10)); // Business hours
      saleDate.setMinutes(Math.floor(Math.random() * 60));

      try {
        const sale = await prisma.sale.create({
          data: {
            saleCode: generateSaleCode(saleIndex),
            type: isMemberSale ? "MEMBER" : "GENERAL",
            locationId,
            memberId: member?.id || null,
            subtotal,
            discount: totalDiscount,
            total,
            createdById: superAdmin.id,
            createdAt: saleDate,
            items: {
              create: saleItems,
            },
            payments: {
              create: payments,
            },
          },
        });

        // Update member aggregation if this is a member sale
        if (member) {
          const fullMember = await prisma.member.findUnique({
            where: { id: member.id },
          });

          await prisma.member.update({
            where: { id: member.id },
            data: {
              totalSales: {
                increment: total,
              },
              ...(fullMember &&
                !fullMember.memberSince && { memberSince: saleDate }),
              ...(fullMember &&
                !fullMember.firstPurchase && { firstPurchase: saleDate }),
            },
          });
        }

        console.log(
          `✅ Created sale: ${sale.saleCode} (${isMemberSale ? "Member" : "General"}) - ${saleItems.length} items - Rs.${total.toFixed(2)}`,
        );
        saleIndex++;
      } catch (error) {
        // Skip if duplicate sale code
        continue;
      }
    }

    console.log(`✅ Created ${saleIndex - 1} sample sales`);
  } else if (existingSalesCount > 0) {
    console.log(
      `⚠️  Sales already exist (${existingSalesCount}). Skipping sales creation.`,
    );
  }

  // ============================================
  // CRM: DEFAULT PIPELINE
  // ============================================
  const defaultPipeline = await prisma.pipeline.findFirst({
    where: { isDefault: true },
  });

  let pipeline = defaultPipeline;
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: "Sales Pipeline",
        isDefault: true,
        stages: [
          { id: "1", name: "Qualification", order: 1, probability: 10 },
          { id: "2", name: "Proposal", order: 2, probability: 30 },
          { id: "3", name: "Negotiation", order: 3, probability: 60 },
          { id: "4", name: "Closed Won", order: 4, probability: 100 },
          { id: "5", name: "Closed Lost", order: 5, probability: 0 },
        ],
      },
    });
    console.log("✅ Created default CRM Sales Pipeline");
  } else {
    console.log("⚠️  Default pipeline already exists. Skipping.");
  }

  const stageNames = ((pipeline?.stages as Array<{ name: string }>) || []).map(
    (s) => s.name,
  );
  const firstStage = stageNames[0] || "Qualification";

  // ============================================
  // 12. CRM: COMPANIES (default: no company)
  // ============================================
  const companiesData = [
    {
      name: "Tech Solutions Nepal",
      website: "https://techsolutions.com.np",
      address: "Thamel, Kathmandu",
      phone: "+977-1-5551001",
    },
    {
      name: "Green Energy Pvt Ltd",
      website: "https://greenenergy.com.np",
      address: "Lalitpur",
      phone: "+977-1-5551002",
    },
    {
      name: "Himalayan Trading Co",
      website: null,
      address: "New Road, Kathmandu",
      phone: "+977-1-5551003",
    },
    {
      name: "Digital Innovations",
      website: "https://digitalinnovations.np",
      address: "Baneshwor",
      phone: null,
    },
    {
      name: "Sunrise Enterprises",
      website: null,
      address: "Patan",
      phone: "+977-1-5551005",
    },
  ];

  const companies: Record<string, { id: string }> = {};
  for (const c of companiesData) {
    let company = await prisma.company.findFirst({ where: { name: c.name } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: c.name,
          website: c.website || null,
          address: c.address || null,
          phone: c.phone || null,
        },
      });
      console.log(`✅ Created company: ${c.name}`);
    }
    companies[c.name] = { id: company.id };
  }

  // ============================================
  // 13. CRM: CONTACT TAGS
  // ============================================
  const tagNames = ["VIP", "Hot Lead", "Follow-up", "Corporate", "Wholesale"];
  const contactTags: Record<string, { id: string }> = {};
  for (const name of tagNames) {
    let tag = await prisma.contactTag.findUnique({ where: { name } });
    if (!tag) {
      tag = await prisma.contactTag.create({ data: { name } });
      console.log(`✅ Created contact tag: ${name}`);
    }
    contactTags[name] = { id: tag.id };
  }

  // ============================================
  // 14. CRM: CONTACTS
  // ============================================
  const contactsData: Array<{
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    memberPhone?: string;
    tagNames?: string[];
  }> = [
    {
      firstName: "Raj",
      lastName: "Sharma",
      email: "raj@techsolutions.com.np",
      phone: "9841000001",
      companyName: "Tech Solutions Nepal",
      memberPhone: "9841000001",
      tagNames: ["Corporate", "VIP"],
    },
    {
      firstName: "Sunita",
      lastName: "Patel",
      email: "sunita@greenenergy.com.np",
      phone: "9841000002",
      companyName: "Green Energy Pvt Ltd",
      memberPhone: "9841000002",
      tagNames: ["Corporate"],
    },
    {
      firstName: "Amit",
      lastName: "Kumar",
      email: "amit@email.com",
      phone: "9841000003",
      companyName: "Himalayan Trading Co",
      memberPhone: "9841000003",
      tagNames: ["Follow-up"],
    },
    {
      firstName: "Priya",
      lastName: "Singh",
      email: "priya@digitalinnovations.np",
      phone: "9841000004",
      companyName: "Digital Innovations",
      memberPhone: "9841000004",
      tagNames: ["Hot Lead", "Corporate"],
    },
    {
      firstName: "Bikash",
      lastName: "Thapa",
      phone: "9841000005",
      memberPhone: "9841000005",
      tagNames: [],
    },
    {
      firstName: "Anita",
      lastName: "Gurung",
      email: "anita@email.com",
      phone: "9841000006",
      companyName: "Sunrise Enterprises",
      memberPhone: "9841000006",
      tagNames: [],
    },
    {
      firstName: "Ramesh",
      lastName: "Adhikari",
      email: "ramesh@email.com",
      phone: "9841000007",
      tagNames: ["Follow-up"],
    },
    {
      firstName: "Sita",
      lastName: "Rai",
      phone: "9841000008",
      memberPhone: "9841000008",
      tagNames: [],
    },
    {
      firstName: "Krishna",
      lastName: "Bhattarai",
      email: "krishna@email.com",
      phone: "9841000009",
      tagNames: ["Wholesale"],
    },
  ];

  const createdContacts: Record<string, { id: string }> = {};
  for (const c of contactsData) {
    const existingByPhone = c.phone
      ? await prisma.contact.findFirst({ where: { phone: c.phone } })
      : null;
    if (existingByPhone) continue;

    const companyId = c.companyName ? companies[c.companyName]?.id : null;
    const memberId = c.memberPhone ? members[c.memberPhone]?.id : null;
    const tagIds = (c.tagNames || [])
      .map((n) => contactTags[n]?.id)
      .filter(Boolean) as string[];

    const contact = await prisma.contact.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName || null,
        email: c.email || null,
        phone: c.phone || null,
        companyId,
        memberId,
        ownedById: superAdmin.id,
        createdById: superAdmin.id,
        tagLinks:
          tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
      },
    });
    createdContacts[`${c.firstName} ${c.lastName || ""}`.trim()] = {
      id: contact.id,
    };
    console.log(`✅ Created contact: ${c.firstName} ${c.lastName || ""}`);
  }

  // ============================================
  // 15. CRM: LEADS
  // ============================================
  const leadsData = [
    {
      name: "Nepal Telecom Project",
      email: "procurement@ntc.gov.np",
      phone: "9841111001",
      companyName: "NTC",
      status: "NEW" as const,
      source: "Website",
    },
    {
      name: "Hotel Himalaya",
      email: "manager@hotelhimalaya.com",
      phone: "9841111002",
      companyName: "Hotel Himalaya",
      status: "CONTACTED" as const,
      source: "Referral",
    },
    {
      name: "College of IT",
      email: "it@college.edu.np",
      phone: "9841111003",
      companyName: "College of IT",
      status: "QUALIFIED" as const,
      source: "Cold Call",
    },
    {
      name: "Startup XYZ",
      email: "founder@startup.xyz",
      status: "NEW" as const,
      source: "Website",
    },
  ];

  const createdLeads: Record<string, { id: string }> = {};
  for (const l of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        email: l.email || null,
        phone: l.phone || null,
        companyName: l.companyName || null,
        status: l.status,
        source: l.source || null,
        assignedToId: superAdmin.id,
        createdById: superAdmin.id,
      },
    });
    createdLeads[l.name] = { id: lead.id };
    console.log(`✅ Created lead: ${l.name}`);
  }

  // ============================================
  // 16. CRM: DEALS
  // ============================================
  if (pipeline) {
    const dealsData: Array<{
      name: string;
      value: number;
      contactKey?: string;
      memberPhone?: string;
      companyName?: string;
    }> = [
      {
        name: "Tech Solutions - Enterprise License",
        value: 250000,
        contactKey: "Raj Sharma",
        companyName: "Tech Solutions Nepal",
      },
      {
        name: "Green Energy - Solar Panel Order",
        value: 180000,
        contactKey: "Sunita Patel",
        companyName: "Green Energy Pvt Ltd",
      },
      {
        name: "Himalayan Trading - Bulk Order",
        value: 95000,
        contactKey: "Amit Kumar",
        companyName: "Himalayan Trading Co",
      },
      {
        name: "Digital Innovations - Consulting",
        value: 120000,
        contactKey: "Priya Singh",
        companyName: "Digital Innovations",
      },
      {
        name: "Bikash Thapa - Personal Order",
        value: 45000,
        memberPhone: "9841000005",
      },
      {
        name: "Sunrise Enterprises - Office Furniture",
        value: 320000,
        contactKey: "Anita Gurung",
        companyName: "Sunrise Enterprises",
      },
    ];

    for (const d of dealsData) {
      const contactId = d.contactKey ? createdContacts[d.contactKey]?.id : null;
      const memberId = d.memberPhone ? members[d.memberPhone]?.id : null;
      const companyId = d.companyName ? companies[d.companyName]?.id : null;

      await prisma.deal.create({
        data: {
          name: d.name,
          value: d.value,
          stage: firstStage,
          probability: 10,
          status: "OPEN",
          contactId: contactId || null,
          memberId: memberId || null,
          companyId: companyId || null,
          pipelineId: pipeline.id,
          assignedToId: superAdmin.id,
          createdById: superAdmin.id,
        },
      });
      console.log(`✅ Created deal: ${d.name}`);
    }
  }

  // ============================================
  // 17. CRM: TASKS
  // ============================================
  const contactIdsForTasks = Object.values(createdContacts);
  const createdDeals = await prisma.deal.findMany({
    take: 3,
    select: { id: true },
  });
  const taskTitles = [
    "Follow up with Raj",
    "Send proposal to Green Energy",
    "Call Amit for negotiation",
    "Prepare quote for Priya",
    "Schedule demo with Bikash",
  ];
  for (let i = 0; i < Math.min(5, taskTitles.length); i++) {
    await prisma.task.create({
      data: {
        title: taskTitles[i],
        dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        completed: false,
        contactId: contactIdsForTasks[i]?.id || null,
        dealId: createdDeals[i]?.id || null,
        assignedToId: superAdmin.id,
      },
    });
    console.log(`✅ Created task: ${taskTitles[i]}`);
  }

  // ============================================
  // 18. CRM: ACTIVITIES
  // ============================================
  const firstContactId = contactIdsForTasks[0]?.id;
  const firstDealId = createdDeals[0]?.id;
  if (firstContactId || firstDealId) {
    await prisma.activity.create({
      data: {
        type: "CALL",
        subject: "Initial discovery call",
        notes: "Discussed requirements and timeline",
        activityAt: new Date(),
        contactId: firstContactId || null,
        dealId: firstDealId || null,
        createdById: superAdmin.id,
      },
    });
    await prisma.activity.create({
      data: {
        type: "MEETING",
        subject: "Proposal presentation",
        notes: "Scheduled for next week",
        activityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        contactId: firstContactId || null,
        dealId: firstDealId || null,
        createdById: superAdmin.id,
      },
    });
    console.log("✅ Created sample activities");
  }

  console.log("\n🎉 Seeding completed successfully!");
  console.log("📝 You can now log in with the credentials from your .env file");
  console.log("🏢 Vendors have been created");
  console.log("📦 Sample products have been added to the database");
  console.log("📍 Locations (Warehouse & Showrooms) have been created");
  console.log(
    "👥 Sample members (customers) with full profile data have been created",
  );
  console.log("🎟️  Promo codes have been created");
  console.log("🧾 Sample sales with payment breakdowns have been generated");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
