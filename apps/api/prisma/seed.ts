import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import * as path from "path";

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  // Get superAdmin credentials from environment variables
  const superAdminUsername = process.env.SUPERADMIN_USERNAME;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!superAdminUsername || !superAdminPassword) {
    throw new Error(
      "❌ Missing required environment variables: SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set in .env file",
    );
  }

  // ============================================
  // 0. CREATE PLAN LIMITS & PRICING PLANS
  // ============================================
  console.log("--- Setting up plan configuration ---");

  const planLimitsData = [
    {
      tier: "STARTER" as const,
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 2,
      maxMembers: 500,
      bulkUpload: false,
      analytics: false,
      promoManagement: false,
      auditLogs: false,
      apiAccess: false,
    },
    {
      tier: "PROFESSIONAL" as const,
      maxUsers: 10,
      maxProducts: 1000,
      maxLocations: 10,
      maxMembers: 5000,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
    },
    {
      tier: "ENTERPRISE" as const,
      maxUsers: -1, // unlimited
      maxProducts: -1,
      maxLocations: -1,
      maxMembers: -1,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: true,
      apiAccess: true,
    },
  ];

  for (const pl of planLimitsData) {
    await prisma.planLimit.upsert({
      where: { tier: pl.tier },
      update: pl,
      create: pl,
    });
  }
  console.log("✅ Plan limits configured (STARTER, PROFESSIONAL, ENTERPRISE)");

  // Pricing plans (in NPR)
  const pricingData = [
    {
      tier: "STARTER" as const,
      billingCycle: "MONTHLY" as const,
      price: 2000,
      originalPrice: null,
    },
    {
      tier: "STARTER" as const,
      billingCycle: "ANNUAL" as const,
      price: 20000,
      originalPrice: 24000,
    },
    {
      tier: "PROFESSIONAL" as const,
      billingCycle: "MONTHLY" as const,
      price: 5000,
      originalPrice: null,
    },
    {
      tier: "PROFESSIONAL" as const,
      billingCycle: "ANNUAL" as const,
      price: 50000,
      originalPrice: 60000,
    },
    {
      tier: "ENTERPRISE" as const,
      billingCycle: "MONTHLY" as const,
      price: 12000,
      originalPrice: null,
    },
    {
      tier: "ENTERPRISE" as const,
      billingCycle: "ANNUAL" as const,
      price: 120000,
      originalPrice: 144000,
    },
  ];

  for (const pp of pricingData) {
    await prisma.pricingPlan.upsert({
      where: {
        tier_billingCycle: { tier: pp.tier, billingCycle: pp.billingCycle },
      },
      update: { price: pp.price, originalPrice: pp.originalPrice },
      create: pp,
    });
  }
  console.log("✅ Pricing plans configured\n");

  // ============================================
  // 1. CREATE DEFAULT TENANT
  // ============================================
  console.log("--- Setting up default tenant ---");

  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: "default" },
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: "Default Organization",
        slug: "default",
        plan: "PROFESSIONAL",
        isTrial: false,
        subscriptionStatus: "ACTIVE",
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
    console.log(
      `✅ Created default tenant: "${defaultTenant.name}" (slug: ${defaultTenant.slug})`,
    );
  } else {
    console.log(
      `⚠️  Default tenant already exists (slug: ${defaultTenant.slug})`,
    );
  }

  const tenantId = defaultTenant.id;

  // ============================================
  // 1b. CREATE PLATFORM ADMIN USER
  // ============================================
  let platformAdmin = await prisma.user.findFirst({
    where: { role: "platformAdmin" },
  });

  if (!platformAdmin) {
    const hashedPlatformPw = await bcrypt.hash("platform123", 10);
    platformAdmin = await prisma.user.create({
      data: {
        tenantId, // Platform admin is assigned to default tenant for FK
        username: "platform",
        password: hashedPlatformPw,
        role: "platformAdmin",
      },
    });
    console.log(
      `✅ Created platform admin user (username: platform, password: platform123)`,
    );
  } else {
    console.log(`⚠️  Platform admin already exists`);
  }

  // ============================================
  // 1c. CREATE SUPER ADMIN USER (for default tenant)
  // ============================================
  let superAdmin = await prisma.user.findFirst({
    where: { tenantId, username: superAdminUsername },
  });

  if (superAdmin) {
    console.log(
      `⚠️  User "${superAdminUsername}" already exists. Using existing user.`,
    );
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    superAdmin = await prisma.user.create({
      data: {
        tenantId,
        username: superAdminUsername,
        password: hashedPassword,
        role: "superAdmin",
      },
    });
    console.log(
      `✅ Created superAdmin user: ${superAdmin.username} (tenant: default)`,
    );
  }

  // ============================================
  // 2. CREATE DISCOUNT TYPES (tenant-scoped)
  // ============================================
  console.log("\n--- Setting up tenant data ---");

  const discountTypeNames = ["Non-Member", "Member", "Wholesale", "Special"];
  const discountTypeDescriptions: Record<string, string> = {
    "Non-Member": "Regular discount for walk-in / non-member customers",
    Special: "Special product-specific discount with higher priority",
    Member: "Discount for registered members",
    Wholesale: "Bulk purchase discount",
  };

  const discountTypes: Record<string, { id: string }> = {};

  for (const name of discountTypeNames) {
    let discountType = await prisma.discountType.findFirst({
      where: { tenantId, name },
    });

    if (!discountType) {
      discountType = await prisma.discountType.create({
        data: {
          tenantId,
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
  // 3. CREATE VENDORS (tenant-scoped)
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
    let vendor = await prisma.vendor.findFirst({
      where: { tenantId, name: vendorData.name },
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: { tenantId, ...vendorData },
      });
      console.log(`✅ Created vendor: ${vendorData.name}`);
    } else {
      console.log(`⚠️  Vendor "${vendorData.name}" already exists. Skipping.`);
    }
    vendors[vendorData.name] = { id: vendor.id };
  }

  const categoryVendorMap: Record<string, string> = {
    Electronics: "Global Electronics Ltd",
    Furniture: "Comfort Furniture Co",
    Clothing: "Fashion Trends Inc",
    Sports: "Sports World Suppliers",
    Books: "Book Publishers Nepal",
  };

  // ============================================
  // 4. CREATE CATEGORIES (tenant-scoped)
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
    let category = await prisma.category.findFirst({
      where: { tenantId, name: cat.name },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { tenantId, ...cat },
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
        where: { name: subName, categoryId: category.id },
      });

      if (!sub) {
        sub = await prisma.subCategory.create({
          data: { name: subName, categoryId: category.id },
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
  // 5. CREATE PRODUCTS WITH VARIATIONS (tenant-scoped)
  // ============================================
  const productTemplates: Record<
    string,
    Array<{
      namePrefix: string;
      baseCost: number;
      baseMrp: number;
      weight: number;
      length?: number;
      breadth?: number;
      height?: number;
    }>
  > = {
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
    ],
  };

  const colorVariations: Record<string, string[]> = {
    Electronics: ["Black", "White", "Silver", "Space Gray"],
    Furniture: ["Black", "White", "Walnut", "Oak"],
    Clothing: ["Black", "White", "Navy Blue", "Gray", "Red"],
    Sports: ["Black", "Blue", "Red", "Green"],
    Books: ["Hardcover", "Paperback"],
  };

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
  ];

  const modifiers = ["Pro", "Elite", "Classic", "Premium", "Ultra"];
  const categoryCodes: Record<string, string> = {
    Electronics: "ELEC",
    Furniture: "FURN",
    Clothing: "CLTH",
    Sports: "SPRT",
    Books: "BOOK",
  };
  const productCounter: Record<string, number> = {
    Electronics: 0,
    Furniture: 0,
    Clothing: 0,
    Sports: 0,
    Books: 0,
  };

  for (const [category, templates] of Object.entries(productTemplates)) {
    const colors = colorVariations[category] || ["Default"];

    for (const template of templates) {
      productCounter[category]++;
      const counter = productCounter[category];
      const modifier = modifiers[(counter - 1) % modifiers.length];
      const productName = `${template.namePrefix} ${modifier}`;
      const imsCode = `${categoryCodes[category]}-${String(counter).padStart(3, "0")}`;
      const priceVariation = 0.9 + Math.random() * 0.2;
      const costPrice =
        Math.round(template.baseCost * priceVariation * 100) / 100;
      const mrp = Math.round(template.baseMrp * priceVariation * 100) / 100;
      const numVariations = Math.min(
        colors.length,
        2 + Math.floor(Math.random() * 2),
      );
      const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
      const selectedColors = shuffledColors.slice(0, numVariations);
      const variations = selectedColors.map((color) => ({
        color,
        stockQuantity: 10 + Math.floor(Math.random() * 90),
      }));
      const discounts =
        discountConfigs[Math.floor(Math.random() * discountConfigs.length)] ||
        [];
      const subConfig = subCategoriesConfig[category] || [];
      const subCategoryName =
        subConfig.length > 0
          ? subConfig[(counter - 1) % subConfig.length]
          : undefined;

      const existingProduct = await prisma.product.findFirst({
        where: { tenantId, imsCode },
      });
      if (existingProduct) {
        continue;
      }

      const vendorName = categoryVendorMap[category];
      const vendorId = vendorName ? vendors[vendorName]?.id : null;
      let subCategoryId: string | null = null;
      if (subCategoryName) {
        const key = `${category}:${subCategoryName}`;
        const sub = subCategories[key];
        if (sub) subCategoryId = sub.id;
      }

      const product = await prisma.product.create({
        data: {
          tenantId,
          imsCode,
          name: productName,
          categoryId: categories[category].id,
          subCategory: subCategoryName || null,
          subCategoryId,
          description: `High-quality ${productName.toLowerCase()} - ${category.toLowerCase()} category`,
          costPrice,
          mrp,
          finalSp: mrp,
          vendorId: vendorId || null,
          length: template.length,
          breadth: template.breadth,
          height: template.height,
          weight: template.weight,
          createdById: superAdmin.id,
          variations: {
            create: variations.map((v) => ({
              color: v.color,
              stockQuantity: v.stockQuantity,
            })),
          },
          discounts: {
            create: discounts.map((d) => ({
              discountTypeId: discountTypes[d.type].id,
              discountPercentage: d.percentage,
              valueType: "PERCENTAGE",
              value: d.percentage,
              isActive: true,
            })),
          },
        },
        include: { variations: true },
      });

      console.log(
        `✅ Created product: ${product.name} (${product.imsCode}) with ${product.variations.length} variations`,
      );
    }
  }

  // ============================================
  // 6. CREATE LOCATIONS (tenant-scoped)
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
    let location = await prisma.location.findFirst({
      where: { tenantId, name: loc.name },
    });

    if (!location) {
      location = await prisma.location.create({
        data: {
          tenantId,
          name: loc.name,
          type: loc.type,
          address: loc.address,
          isDefaultWarehouse: loc.name === "Main Warehouse",
        },
      });
      console.log(`✅ Created location: ${loc.name} (${loc.type})`);
    } else {
      console.log(`⚠️  Location "${loc.name}" already exists. Skipping.`);
    }
    locations[loc.name] = { id: location.id };
  }

  // ============================================
  // 7. MIGRATE STOCK TO LOCATION INVENTORY
  // ============================================
  const mainWarehouse = locations["Main Warehouse"];

  if (mainWarehouse) {
    const allVariations = await prisma.productVariation.findMany({
      select: { id: true, stockQuantity: true },
    });

    for (const variation of allVariations) {
      const existingInventory = await prisma.locationInventory.findFirst({
        where: {
          locationId: mainWarehouse.id,
          variationId: variation.id,
          subVariationId: null,
        } as any,
      });

      if (!existingInventory && variation.stockQuantity > 0) {
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
  // 8. DISTRIBUTE STOCK TO SHOWROOMS
  // ============================================
  const showroomA = locations["Showroom A"];
  const showroomB = locations["Showroom B"];

  if (showroomA && showroomB && mainWarehouse) {
    const warehouseInventory = await prisma.locationInventory.findMany({
      where: { locationId: mainWarehouse.id },
    });

    let distributedCount = 0;
    for (const inv of warehouseInventory) {
      if (inv.quantity < 20) continue;
      const toA = Math.floor(inv.quantity * (0.2 + Math.random() * 0.2));
      const toB = Math.floor(inv.quantity * (0.15 + Math.random() * 0.15));

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

      if (!existingA && toA > 0) {
        await prisma.locationInventory.create({
          data: {
            locationId: showroomA.id,
            variationId: inv.variationId,
            subVariationId: null,
            quantity: toA,
          } as any,
        });
        distributedCount++;
      }
      if (!existingB && toB > 0) {
        await prisma.locationInventory.create({
          data: {
            locationId: showroomB.id,
            variationId: inv.variationId,
            subVariationId: null,
            quantity: toB,
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
  // 9. CREATE SAMPLE MEMBERS (tenant-scoped)
  // ============================================
  const membersData = [
    {
      phone: "9841000001",
      name: "Rajesh Sharma",
      email: "rajesh.sharma@email.com",
      gender: "Male",
      age: 45,
      address: "Thamel, Kathmandu",
      memberStatus: "VIP" as const,
    },
    {
      phone: "9841000002",
      name: "Sunita Patel",
      email: "sunita.p@email.com",
      gender: "Female",
      age: 32,
      address: "Patan, Lalitpur",
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000003",
      name: "Amit Kumar",
      email: "amit.kumar@email.com",
      gender: "Male",
      age: 28,
      address: "Baneshwor, Kathmandu",
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000004",
      name: "Priya Singh",
      email: "priya.singh@email.com",
      gender: "Female",
      age: 35,
      address: "New Road, Kathmandu",
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9841000005",
      name: "Bikash Thapa",
      gender: "Male",
      age: 40,
      address: "Koteshwor, Kathmandu",
      memberStatus: "ACTIVE" as const,
    },
  ];

  const members: Record<string, { id: string; phone: string }> = {};

  for (const memberData of membersData) {
    let member = await prisma.member.findFirst({
      where: { tenantId, phone: memberData.phone },
    });

    if (!member) {
      const memberSince = new Date();
      memberSince.setDate(
        memberSince.getDate() - Math.floor(Math.random() * 365),
      );

      member = await prisma.member.create({
        data: {
          tenantId,
          phone: memberData.phone,
          name: memberData.name || null,
          email: memberData.email || null,
          gender: memberData.gender || null,
          age: memberData.age || null,
          address: memberData.address || null,
          memberStatus: memberData.memberStatus || "ACTIVE",
          memberSince,
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
  // 10. CREATE PROMO CODES (tenant-scoped)
  // ============================================
  const allProducts = await prisma.product.findMany({
    where: { tenantId },
    take: 10,
    select: { id: true },
  });

  const promoCodeData = [
    {
      code: "WELCOME10",
      description: "Welcome discount for new customers",
      valueType: "PERCENTAGE" as const,
      value: 10,
      eligibility: "ALL" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      productIds: allProducts.slice(0, 5).map((p) => p.id),
    },
    {
      code: "MEMBER20",
      description: "Exclusive member discount",
      valueType: "PERCENTAGE" as const,
      value: 20,
      eligibility: "MEMBER" as const,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      usageLimit: 50,
      productIds: allProducts.slice(3, 8).map((p) => p.id),
    },
  ];

  for (const promoData of promoCodeData) {
    let promo = await prisma.promoCode.findFirst({
      where: { tenantId, code: promoData.code },
    });

    if (!promo) {
      promo = await prisma.promoCode.create({
        data: {
          tenantId,
          code: promoData.code,
          description: promoData.description,
          valueType: promoData.valueType,
          value: promoData.value,
          eligibility: promoData.eligibility,
          validFrom: promoData.validFrom,
          validTo: promoData.validTo,
          usageLimit: promoData.usageLimit,
          isActive: true,
          products: {
            create: promoData.productIds.map((productId) => ({ productId })),
          },
        },
      });
      console.log(`✅ Created promo code: ${promoData.code}`);
    } else {
      console.log(
        `⚠️  Promo code "${promoData.code}" already exists. Skipping.`,
      );
    }
  }

  // ============================================
  // 11. CREATE SAMPLE SALES (tenant-scoped)
  // ============================================
  function generateSaleCode(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    return `SL-${dateStr}-${String(index).padStart(4, "0")}`;
  }

  const existingSalesCount = await prisma.sale.count({ where: { tenantId } });

  if (existingSalesCount === 0 && showroomA) {
    const showroomInventory = await prisma.locationInventory.findMany({
      where: { locationId: showroomA.id, quantity: { gt: 0 } },
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
      take: 30,
    });

    const memberPhones = Object.keys(members);
    let saleIndex = 1;

    for (let i = 0; i < 10; i++) {
      if (showroomInventory.length === 0) break;

      const isMemberSale = Math.random() < 0.5;
      const memberPhone = isMemberSale
        ? memberPhones[Math.floor(Math.random() * memberPhones.length)]
        : null;
      const member = memberPhone ? members[memberPhone] : null;

      const numItems = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...showroomInventory].sort(() => Math.random() - 0.5);
      const selectedItems = shuffled.slice(0, numItems);

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
        const quantity = 1 + Math.floor(Math.random() * 2);
        const unitPrice = Number(item.variation.product.mrp);
        const itemSubtotal = unitPrice * quantity;
        let discountPercent = 0;
        if (isMemberSale) {
          const memberDiscount = item.variation.product.discounts.find(
            (d) => d.discountType.name === "Member",
          );
          if (memberDiscount) discountPercent = Number(memberDiscount.value);
        }
        const effectiveDiscount = itemSubtotal * (discountPercent / 100);
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
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));

      try {
        await prisma.sale.create({
          data: {
            tenantId,
            saleCode: generateSaleCode(saleIndex),
            type: isMemberSale ? "MEMBER" : "GENERAL",
            locationId: showroomA.id,
            memberId: member?.id || null,
            subtotal,
            discount: totalDiscount,
            total,
            createdById: superAdmin.id,
            createdAt: saleDate,
            items: { create: saleItems },
            payments: { create: [{ method: "CASH", amount: total }] },
          },
        });
        saleIndex++;
      } catch {
        continue;
      }
    }
    console.log(`✅ Created ${saleIndex - 1} sample sales`);
  } else if (existingSalesCount > 0) {
    console.log(`⚠️  Sales already exist (${existingSalesCount}). Skipping.`);
  }

  // ============================================
  // 12. CREATE SECOND TEST TENANT (for multi-tenant testing)
  // ============================================
  console.log("\n--- Setting up test tenant (Asha Boutique) ---");

  let testTenant = await prisma.tenant.findUnique({
    where: { slug: "test-org" },
  });

  if (!testTenant) {
    testTenant = await prisma.tenant.create({
      data: {
        name: "Asha Boutique",
        slug: "test-org",
        plan: "STARTER",
        isTrial: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subscriptionStatus: "TRIAL",
      },
    });
    console.log(
      `✅ Created test tenant: "${testTenant.name}" (slug: test-org)`,
    );
  } else {
    console.log(`⚠️  Test tenant already exists (slug: test-org)`);
  }

  const testTenantId = testTenant.id;

  // --- Test tenant admin user ---
  let testAdmin = await prisma.user.findFirst({
    where: { tenantId: testTenantId, username: "testadmin" },
  });
  if (!testAdmin) {
    const testAdminPw = await bcrypt.hash("test123", 10);
    testAdmin = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        username: "testadmin",
        password: testAdminPw,
        role: "superAdmin",
      },
    });
    console.log(`✅ Created test tenant admin: testadmin / test123`);
  }

  // --- Test tenant regular user ---
  let testUser = await prisma.user.findFirst({
    where: { tenantId: testTenantId, username: "testuser" },
  });
  if (!testUser) {
    const testUserPw = await bcrypt.hash("test123", 10);
    testUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        username: "testuser",
        password: testUserPw,
        role: "user",
      },
    });
    console.log(`✅ Created test tenant user: testuser / test123`);
  }

  // --- Test tenant discount types ---
  const testDiscountTypes: Record<string, { id: string }> = {};
  for (const name of discountTypeNames) {
    let dt = await prisma.discountType.findFirst({
      where: { tenantId: testTenantId, name },
    });
    if (!dt) {
      dt = await prisma.discountType.create({
        data: { tenantId: testTenantId, name },
      });
    }
    testDiscountTypes[name] = { id: dt.id };
  }
  console.log(`✅ Test tenant discount types ready`);

  // --- Test tenant vendors (different from default) ---
  const testVendorsData = [
    {
      name: "Silk Road Fabrics",
      contact: "orders@silkroadfabrics.com",
      phone: "+977-1-6660001",
      address: "Ason Tole, Kathmandu",
    },
    {
      name: "Mountain Craft Supplies",
      contact: "info@mountaincraft.com",
      phone: "+977-1-6660002",
      address: "Bhaktapur Durbar Square Area",
    },
  ];

  const testVendors: Record<string, { id: string }> = {};
  for (const v of testVendorsData) {
    let vendor = await prisma.vendor.findFirst({
      where: { tenantId: testTenantId, name: v.name },
    });
    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: { tenantId: testTenantId, ...v },
      });
      console.log(`✅ Created test vendor: ${v.name}`);
    }
    testVendors[v.name] = { id: vendor.id };
  }

  // --- Test tenant categories (completely different catalog) ---
  const testCategoriesData = [
    { name: "Women's Wear", description: "Sarees, kurtis, and ethnic wear" },
    {
      name: "Accessories",
      description: "Jewelry, bags, and fashion accessories",
    },
    {
      name: "Men's Wear",
      description: "Shirts, pants, and ethnic wear for men",
    },
  ];

  const testCategories: Record<string, { id: string }> = {};
  for (const cat of testCategoriesData) {
    let category = await prisma.category.findFirst({
      where: { tenantId: testTenantId, name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { tenantId: testTenantId, ...cat },
      });
      console.log(`✅ Created test category: ${cat.name}`);
    }
    testCategories[cat.name] = { id: category.id };
  }

  // --- Test tenant products (boutique products, different from default electronics/furniture) ---
  const testProductsData = [
    {
      imsCode: "AB-001",
      name: "Pashmina Shawl Premium",
      category: "Women's Wear",
      vendor: "Silk Road Fabrics",
      costPrice: 1200,
      mrp: 2999,
      variations: [
        { color: "Crimson Red", stockQuantity: 15 },
        { color: "Royal Blue", stockQuantity: 12 },
        { color: "Ivory White", stockQuantity: 8 },
      ],
    },
    {
      imsCode: "AB-002",
      name: "Handloom Cotton Saree",
      category: "Women's Wear",
      vendor: "Silk Road Fabrics",
      costPrice: 800,
      mrp: 1899,
      variations: [
        { color: "Teal", stockQuantity: 20 },
        { color: "Maroon", stockQuantity: 10 },
      ],
    },
    {
      imsCode: "AB-003",
      name: "Embroidered Kurta Set",
      category: "Women's Wear",
      vendor: "Silk Road Fabrics",
      costPrice: 650,
      mrp: 1499,
      variations: [
        { color: "Olive Green", stockQuantity: 18 },
        { color: "Mustard", stockQuantity: 14 },
        { color: "Peach", stockQuantity: 9 },
      ],
    },
    {
      imsCode: "AB-004",
      name: "Silver Jhumka Earrings",
      category: "Accessories",
      vendor: "Mountain Craft Supplies",
      costPrice: 400,
      mrp: 999,
      variations: [
        { color: "Silver", stockQuantity: 30 },
        { color: "Gold Plated", stockQuantity: 25 },
      ],
    },
    {
      imsCode: "AB-005",
      name: "Handwoven Dhaka Topi",
      category: "Men's Wear",
      vendor: "Mountain Craft Supplies",
      costPrice: 300,
      mrp: 699,
      variations: [
        { color: "Traditional Red", stockQuantity: 40 },
        { color: "Classic Multicolor", stockQuantity: 35 },
      ],
    },
    {
      imsCode: "AB-006",
      name: "Beaded Necklace Set",
      category: "Accessories",
      vendor: "Mountain Craft Supplies",
      costPrice: 550,
      mrp: 1299,
      variations: [
        { color: "Turquoise", stockQuantity: 12 },
        { color: "Coral", stockQuantity: 10 },
      ],
    },
    {
      imsCode: "AB-007",
      name: "Daura Suruwal Classic",
      category: "Men's Wear",
      vendor: "Silk Road Fabrics",
      costPrice: 900,
      mrp: 2199,
      variations: [
        { color: "White", stockQuantity: 15 },
        { color: "Cream", stockQuantity: 12 },
      ],
    },
  ];

  for (const tp of testProductsData) {
    const exists = await prisma.product.findFirst({
      where: { tenantId: testTenantId, imsCode: tp.imsCode },
    });
    if (exists) continue;

    const product = await prisma.product.create({
      data: {
        tenantId: testTenantId,
        imsCode: tp.imsCode,
        name: tp.name,
        categoryId: testCategories[tp.category]!.id,
        description: `${tp.name} - Asha Boutique exclusive`,
        costPrice: tp.costPrice,
        mrp: tp.mrp,
        finalSp: tp.mrp,
        vendorId: testVendors[tp.vendor]?.id || null,
        createdById: testAdmin.id,
        variations: {
          create: tp.variations.map((v) => ({
            color: v.color,
            stockQuantity: v.stockQuantity,
          })),
        },
        discounts: {
          create: [
            {
              discountTypeId: testDiscountTypes["Non-Member"].id,
              discountPercentage: 5,
              valueType: "PERCENTAGE",
              value: 5,
              isActive: true,
            },
            {
              discountTypeId: testDiscountTypes["Member"].id,
              discountPercentage: 12,
              valueType: "PERCENTAGE",
              value: 12,
              isActive: true,
            },
          ],
        },
      },
      include: { variations: true },
    });
    console.log(
      `✅ Created test product: ${product.name} (${product.imsCode}) with ${product.variations.length} variations`,
    );
  }

  // --- Test tenant location ---
  let testLocation = await prisma.location.findFirst({
    where: { tenantId: testTenantId, name: "Main Store" },
  });
  if (!testLocation) {
    testLocation = await prisma.location.create({
      data: {
        tenantId: testTenantId,
        name: "Main Store",
        type: "SHOWROOM",
        address: "Durbar Marg, Kathmandu",
        isDefaultWarehouse: true,
      },
    });
    console.log(`✅ Created test location: Main Store`);
  }

  // Populate test location inventory
  const testVariations = await prisma.productVariation.findMany({
    where: { product: { tenantId: testTenantId } },
    select: { id: true, stockQuantity: true },
  });
  for (const tv of testVariations) {
    const existingInv = await prisma.locationInventory.findFirst({
      where: {
        locationId: testLocation.id,
        variationId: tv.id,
        subVariationId: null,
      } as any,
    });
    if (!existingInv && tv.stockQuantity > 0) {
      await prisma.locationInventory.create({
        data: {
          locationId: testLocation.id,
          variationId: tv.id,
          subVariationId: null,
          quantity: tv.stockQuantity,
        } as any,
      });
    }
  }
  console.log(
    `✅ Populated test location inventory (${testVariations.length} items)`,
  );

  // --- Test tenant members ---
  const testMembersData = [
    {
      phone: "9801000001",
      name: "Sita Devi Rana",
      gender: "Female",
      age: 38,
      address: "Lazimpat, Kathmandu",
      memberStatus: "VIP" as const,
    },
    {
      phone: "9801000002",
      name: "Hari Bahadur Gurung",
      gender: "Male",
      age: 52,
      address: "Thamel, Kathmandu",
      memberStatus: "ACTIVE" as const,
    },
    {
      phone: "9801000003",
      name: "Kamala Shrestha",
      gender: "Female",
      age: 29,
      address: "Patan, Lalitpur",
      memberStatus: "ACTIVE" as const,
    },
  ];

  for (const tm of testMembersData) {
    const exists = await prisma.member.findFirst({
      where: { tenantId: testTenantId, phone: tm.phone },
    });
    if (!exists) {
      await prisma.member.create({
        data: {
          tenantId: testTenantId,
          phone: tm.phone,
          name: tm.name,
          gender: tm.gender,
          age: tm.age,
          address: tm.address,
          memberStatus: tm.memberStatus,
          memberSince: new Date(),
          totalSales: 0,
        },
      });
      console.log(`✅ Created test member: ${tm.name} (${tm.phone})`);
    }
  }

  // ============================================
  // DONE
  // ============================================
  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log(`   Platform Admin: platform / platform123`);
  console.log(
    `   Default Tenant SuperAdmin: ${superAdminUsername} / (from .env)`,
  );
  console.log(`   Test Tenant SuperAdmin: testadmin / test123`);
  console.log("\n🏢 Tenants:");
  console.log(`   Default: slug=default, plan=PROFESSIONAL`);
  console.log(`   Test:    slug=test-org, plan=STARTER (trial)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
