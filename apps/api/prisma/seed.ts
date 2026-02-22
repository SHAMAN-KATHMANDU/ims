import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

// Platform admin credentials from .env (see .env.example)
const PLATFORM_ADMIN_USERNAME =
  process.env.SEED_PLATFORM_ADMIN_USERNAME ?? "platform";
const PLATFORM_ADMIN_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD;

// Production seed: SEED_MODE=production skips test tenants, uses SEED_TENANTS (slug:Name,slug2:Name2)

// Test tenants (test1, test2): use X-Tenant-Slug: test1 or test2, then login with username "admin" or "user" and this password:
const TEST_TENANT_PASSWORD = "test123";

// Ruby tenant: blank slate — X-Tenant-Slug: ruby, username "admin", password "admin123"
const RUBY_TENANT_PASSWORD = "admin123";
const DEMO_TENANT_SLUG = "demo";
const DEMO_TENANT_NAME = "Demo Tenant";
const DEMO_TENANT_USERNAME = "demo";
const DEMO_TENANT_PASSWORD = "demo";

const DEMO_BUSINESS_LIMITS = {
  maxUsers: 25,
  maxProducts: 5000,
  maxLocations: 25,
  maxMembers: 25000,
  maxCategories: 500,
  maxContacts: 5000,
} as const;

async function createManyInChunks<T>(
  items: T[],
  chunkSize: number,
  createChunk: (chunk: T[]) => Promise<unknown>,
) {
  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    await createChunk(chunk);
  }
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `❌ Missing required env: ${name}. Set it in .env (see .env.example).`,
    );
  }
  return value.trim();
}

async function seedTestTenant(
  slug: string,
  name: string,
  defaultPassword: string,
) {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    await deleteTenantBySlug(slug);
    console.log(
      `🗑️  Deleted existing tenant "${slug}" to reseed with full data.`,
    );
  }

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // 1. Tenant + Subscription
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: "PROFESSIONAL",
      isActive: true,
      isTrial: false,
      subscriptionStatus: "ACTIVE",
      planExpiresAt: periodEnd,
      trialEndsAt: null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "PROFESSIONAL",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
  });

  // 2. Users (admin + user) — usernames are "admin" / "user" per tenant so login with X-Tenant-Slug works
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });
  const staffUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "user",
      password: hashedPassword,
      role: "user",
    },
  });

  // 3. Categories + SubCategories
  const cat1 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Furniture",
      description: "Furniture and home items",
    },
  });
  await prisma.subCategory.createMany({
    data: [
      { categoryId: cat1.id, name: "Sofas" },
      { categoryId: cat1.id, name: "Tables" },
    ],
  });
  const subCatSofas = await prisma.subCategory.findFirst({
    where: { categoryId: cat1.id, name: "Sofas" },
  });
  const subCatTables = await prisma.subCategory.findFirst({
    where: { categoryId: cat1.id, name: "Tables" },
  });

  const cat2 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Electronics",
      description: "Electronic devices",
    },
  });
  await prisma.subCategory.createMany({
    data: [
      { categoryId: cat2.id, name: "Phones" },
      { categoryId: cat2.id, name: "Accessories" },
    ],
  });
  const cat3 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Apparel",
      description: "Clothing and wear",
    },
  });
  await prisma.subCategory.createMany({
    data: [
      { categoryId: cat3.id, name: "Men" },
      { categoryId: cat3.id, name: "Women" },
      { categoryId: cat3.id, name: "Kids" },
    ],
  });
  const cat4 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Home & Kitchen",
      description: "Kitchen and home goods",
    },
  });
  await prisma.subCategory.createMany({
    data: [
      { categoryId: cat4.id, name: "Cookware" },
      { categoryId: cat4.id, name: "Decor" },
    ],
  });

  // 4. Vendors
  const vendor1 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Vendor A`,
      contact: "Vendor Contact",
      phone: "9810000001",
      address: "Kathmandu",
    },
  });
  const vendor2 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Vendor B`,
      contact: "Vendor B Contact",
      phone: "9810000002",
    },
  });
  const vendor3 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Vendor C`,
      contact: "Vendor C Contact",
      phone: "9810000003",
      address: "Lalitpur",
    },
  });

  // 5. Locations (warehouse + showroom + extra)
  const warehouse = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Main Warehouse`,
      type: "WAREHOUSE",
      address: "Warehouse St 1",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });
  const showroom = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Showroom`,
      type: "SHOWROOM",
      address: "Showroom Ave 1",
      isActive: true,
      isDefaultWarehouse: false,
    },
  });
  const outlet = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: `${name} Outlet`,
      type: "SHOWROOM",
      address: "Outlet Park",
      isActive: true,
      isDefaultWarehouse: false,
    },
  });

  // 6. DiscountTypes
  const discountTypePercent = await prisma.discountType.create({
    data: {
      tenantId: tenant.id,
      name: "Member Discount",
      description: "Percentage off for members",
    },
  });
  const discountTypeFlat = await prisma.discountType.create({
    data: {
      tenantId: tenant.id,
      name: "Seasonal Flat",
      description: "Flat amount off",
    },
  });

  // 7. Products with variations and inventory
  const product1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P001`,
      name: "Wooden Sofa",
      categoryId: cat1.id,
      subCategory: "Sofas",
      subCategoryId: subCatSofas?.id ?? null,
      description: "Classic wooden sofa",
      costPrice: 25000,
      mrp: 35000,
      finalSp: 32000,
      vendorId: vendor1.id,
      createdById: adminUser.id,
    },
  });
  const product2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P002`,
      name: "Dining Table",
      categoryId: cat1.id,
      subCategory: "Tables",
      subCategoryId: subCatTables?.id ?? null,
      costPrice: 18000,
      mrp: 25000,
      finalSp: 23000,
      vendorId: vendor1.id,
      createdById: adminUser.id,
    },
  });
  const product3 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P003`,
      name: "LED Lamp",
      categoryId: cat2.id,
      subCategory: "Accessories",
      costPrice: 500,
      mrp: 800,
      finalSp: 750,
      vendorId: vendor2.id,
      createdById: adminUser.id,
    },
  });
  const product4 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P004`,
      name: "Bookshelf",
      categoryId: cat1.id,
      subCategory: "Tables",
      costPrice: 4500,
      mrp: 6500,
      finalSp: 6000,
      vendorId: vendor1.id,
      createdById: adminUser.id,
    },
  });
  const product5 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P005`,
      name: "Wireless Earbuds",
      categoryId: cat2.id,
      subCategory: "Accessories",
      costPrice: 1200,
      mrp: 1999,
      finalSp: 1799,
      vendorId: vendor2.id,
      createdById: adminUser.id,
    },
  });
  const product6 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P006`,
      name: "Cotton T-Shirt",
      categoryId: cat3.id,
      subCategory: "Men",
      costPrice: 400,
      mrp: 899,
      finalSp: 799,
      vendorId: vendor3.id,
      createdById: adminUser.id,
    },
  });
  const product7 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P007`,
      name: "Non-Stick Pan",
      categoryId: cat4.id,
      subCategory: "Cookware",
      costPrice: 800,
      mrp: 1499,
      finalSp: 1299,
      vendorId: vendor3.id,
      createdById: adminUser.id,
    },
  });
  const product8 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P008`,
      name: "Wall Clock",
      categoryId: cat4.id,
      subCategory: "Decor",
      costPrice: 350,
      mrp: 699,
      finalSp: 599,
      vendorId: vendor1.id,
      createdById: adminUser.id,
    },
  });
  const product9 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P009`,
      name: "Desk Chair",
      categoryId: cat1.id,
      subCategory: "Sofas",
      costPrice: 3200,
      mrp: 4999,
      finalSp: 4499,
      vendorId: vendor1.id,
      createdById: adminUser.id,
    },
  });
  const product10 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${slug.toUpperCase()}-P010`,
      name: "Power Bank",
      categoryId: cat2.id,
      subCategory: "Accessories",
      costPrice: 900,
      mrp: 1599,
      finalSp: 1399,
      vendorId: vendor2.id,
      createdById: adminUser.id,
    },
  });

  const var1p1 = await prisma.productVariation.create({
    data: {
      productId: product1.id,
      color: "Brown",
      stockQuantity: 10,
    },
  });
  const var2p1 = await prisma.productVariation.create({
    data: {
      productId: product1.id,
      color: "White",
      stockQuantity: 5,
    },
  });
  const var1p2 = await prisma.productVariation.create({
    data: {
      productId: product2.id,
      color: "Natural",
      stockQuantity: 8,
    },
  });
  const var1p3 = await prisma.productVariation.create({
    data: {
      productId: product3.id,
      color: "White",
      stockQuantity: 50,
    },
  });
  const var1p4 = await prisma.productVariation.create({
    data: { productId: product4.id, color: "Oak", stockQuantity: 12 },
  });
  const var2p4 = await prisma.productVariation.create({
    data: { productId: product4.id, color: "Walnut", stockQuantity: 8 },
  });
  const var1p5 = await prisma.productVariation.create({
    data: { productId: product5.id, color: "Black", stockQuantity: 40 },
  });
  const var2p5 = await prisma.productVariation.create({
    data: { productId: product5.id, color: "White", stockQuantity: 35 },
  });
  const var1p6 = await prisma.productVariation.create({
    data: { productId: product6.id, color: "Navy", stockQuantity: 100 },
  });
  const var2p6 = await prisma.productVariation.create({
    data: { productId: product6.id, color: "Black", stockQuantity: 80 },
  });
  const var1p7 = await prisma.productVariation.create({
    data: { productId: product7.id, color: "Silver", stockQuantity: 25 },
  });
  const var1p8 = await prisma.productVariation.create({
    data: { productId: product8.id, color: "Black", stockQuantity: 30 },
  });
  const var1p9 = await prisma.productVariation.create({
    data: { productId: product9.id, color: "Grey", stockQuantity: 15 },
  });
  const var1p10 = await prisma.productVariation.create({
    data: { productId: product10.id, color: "Black", stockQuantity: 45 },
  });

  const subVar1 = await prisma.productSubVariation.create({
    data: { variationId: var1p1.id, name: "Standard" },
  });
  const subVar2 = await prisma.productSubVariation.create({
    data: { variationId: var1p1.id, name: "Large" },
  });

  await prisma.variationPhoto.create({
    data: {
      variationId: var1p1.id,
      photoUrl: "https://example.com/sofa-brown.jpg",
      isPrimary: true,
    },
  });

  await prisma.productDiscount.createMany({
    data: [
      {
        productId: product1.id,
        discountTypeId: discountTypePercent.id,
        discountPercentage: 10,
        valueType: "PERCENTAGE",
        value: 10,
        isActive: true,
      },
      {
        productId: product2.id,
        discountTypeId: discountTypeFlat.id,
        discountPercentage: 0,
        valueType: "FLAT",
        value: 500,
        isActive: true,
      },
      {
        productId: product4.id,
        discountTypeId: discountTypePercent.id,
        discountPercentage: 8,
        valueType: "PERCENTAGE",
        value: 8,
        isActive: true,
      },
      {
        productId: product6.id,
        discountTypeId: discountTypeFlat.id,
        discountPercentage: 0,
        valueType: "FLAT",
        value: 50,
        isActive: true,
      },
    ],
  });

  // Location inventory
  await prisma.locationInventory.createMany({
    data: [
      {
        locationId: warehouse.id,
        variationId: var1p1.id,
        subVariationId: subVar1.id,
        quantity: 6,
      },
      {
        locationId: warehouse.id,
        variationId: var1p1.id,
        subVariationId: subVar2.id,
        quantity: 4,
      },
      { locationId: warehouse.id, variationId: var2p1.id, quantity: 5 },
      { locationId: warehouse.id, variationId: var1p2.id, quantity: 8 },
      { locationId: warehouse.id, variationId: var1p3.id, quantity: 30 },
      { locationId: warehouse.id, variationId: var1p4.id, quantity: 10 },
      { locationId: warehouse.id, variationId: var2p4.id, quantity: 6 },
      { locationId: warehouse.id, variationId: var1p5.id, quantity: 25 },
      { locationId: warehouse.id, variationId: var1p6.id, quantity: 60 },
      { locationId: warehouse.id, variationId: var1p7.id, quantity: 15 },
      { locationId: warehouse.id, variationId: var1p8.id, quantity: 20 },
      { locationId: warehouse.id, variationId: var1p9.id, quantity: 10 },
      { locationId: warehouse.id, variationId: var1p10.id, quantity: 30 },
      {
        locationId: showroom.id,
        variationId: var1p1.id,
        subVariationId: subVar1.id,
        quantity: 2,
      },
      { locationId: showroom.id, variationId: var1p3.id, quantity: 20 },
      { locationId: showroom.id, variationId: var1p4.id, quantity: 2 },
      { locationId: showroom.id, variationId: var1p5.id, quantity: 15 },
      { locationId: showroom.id, variationId: var1p6.id, quantity: 20 },
      { locationId: outlet.id, variationId: var1p6.id, quantity: 20 },
      { locationId: outlet.id, variationId: var1p8.id, quantity: 10 },
    ],
  });

  // 8. Members
  const member1 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000001-${slug}`,
      name: "Ram Sharma",
      email: "ram@example.com",
      notes: "VIP customer",
      isActive: true,
      memberStatus: "VIP",
      totalSales: 0,
      memberSince: new Date(),
    },
  });
  const member2 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000002-${slug}`,
      name: "Sita Devi",
      email: "sita@example.com",
      isActive: true,
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member3 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000003-${slug}`,
      name: "Gita Karki",
      email: "gita@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member4 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000004-${slug}`,
      name: "Krishna Thapa",
      email: "krishna@example.com",
      memberStatus: "VIP",
      totalSales: 0,
    },
  });
  const member5 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000005-${slug}`,
      name: "Anita Gurung",
      email: "anita@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member6 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000006-${slug}`,
      name: "Bikash Rai",
      memberStatus: "PROSPECT",
      totalSales: 0,
    },
  });
  const member7 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000007-${slug}`,
      name: "Puja Maharjan",
      email: "puja@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member8 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: `9800000008-${slug}`,
      name: "Rajesh Shrestha",
      email: "rajesh@example.com",
      memberStatus: "INACTIVE",
      totalSales: 0,
    },
  });

  // 9. Transfers
  const transfer = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${slug.toUpperCase()}-TRF-001`,
      fromLocationId: warehouse.id,
      toLocationId: showroom.id,
      status: "COMPLETED",
      notes: "Initial stock transfer",
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: now,
      completedAt: now,
    },
  });
  await prisma.transferItem.createMany({
    data: [
      {
        transferId: transfer.id,
        variationId: var1p1.id,
        subVariationId: subVar1.id,
        quantity: 2,
      },
      { transferId: transfer.id, variationId: var1p3.id, quantity: 10 },
    ],
  });
  await prisma.transferLog.create({
    data: {
      transferId: transfer.id,
      action: "created",
      details: {},
      userId: adminUser.id,
    },
  });
  const transfer2 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${slug.toUpperCase()}-TRF-002`,
      fromLocationId: warehouse.id,
      toLocationId: outlet.id,
      status: "COMPLETED",
      notes: "Stock for outlet",
      createdById: staffUser.id,
      approvedById: adminUser.id,
      approvedAt: now,
      completedAt: now,
    },
  });
  await prisma.transferItem.createMany({
    data: [
      { transferId: transfer2.id, variationId: var1p6.id, quantity: 20 },
      { transferId: transfer2.id, variationId: var1p8.id, quantity: 10 },
    ],
  });
  await prisma.transferLog.createMany({
    data: [
      {
        transferId: transfer2.id,
        action: "created",
        details: {},
        userId: staffUser.id,
      },
      {
        transferId: transfer2.id,
        action: "approved",
        details: {},
        userId: adminUser.id,
      },
    ],
  });
  const transfer3 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${slug.toUpperCase()}-TRF-003`,
      fromLocationId: warehouse.id,
      toLocationId: showroom.id,
      status: "PENDING",
      notes: "Pending approval",
      createdById: staffUser.id,
    },
  });
  await prisma.transferItem.createMany({
    data: [
      { transferId: transfer3.id, variationId: var1p5.id, quantity: 5 },
      { transferId: transfer3.id, variationId: var1p9.id, quantity: 3 },
    ],
  });

  // 10. Sales with items and payments
  const sale1 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S001`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member1.id,
      subtotal: 64000,
      discount: 3200,
      total: 60800,
      createdById: staffUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale1.id,
      variationId: var1p1.id,
      subVariationId: subVar1.id,
      quantity: 2,
      unitPrice: 32000,
      totalMrp: 64000,
      discountPercent: 5,
      discountAmount: 3200,
      lineTotal: 60800,
    },
  });
  await prisma.salePayment.createMany({
    data: [{ saleId: sale1.id, method: "CASH", amount: 60800 }],
  });

  const sale2 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S002`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: showroom.id,
      subtotal: 750,
      discount: 0,
      total: 750,
      createdById: adminUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale2.id,
      variationId: var1p3.id,
      quantity: 1,
      unitPrice: 750,
      totalMrp: 750,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: 750,
    },
  });
  await prisma.salePayment.create({
    data: { saleId: sale2.id, method: "CASH", amount: 750 },
  });
  const sale3 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S003`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member3.id,
      subtotal: 11997,
      discount: 600,
      total: 11397,
      createdById: adminUser.id,
    },
  });
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale3.id,
        variationId: var1p5.id,
        quantity: 2,
        unitPrice: 1799,
        totalMrp: 3598,
        discountPercent: 5,
        discountAmount: 180,
        lineTotal: 3418,
      },
      {
        saleId: sale3.id,
        variationId: var1p10.id,
        quantity: 2,
        unitPrice: 1399,
        totalMrp: 2798,
        discountPercent: 5,
        discountAmount: 140,
        lineTotal: 2658,
      },
      {
        saleId: sale3.id,
        variationId: var1p8.id,
        quantity: 2,
        unitPrice: 599,
        totalMrp: 1198,
        discountPercent: 5,
        discountAmount: 60,
        lineTotal: 1138,
      },
    ],
  });
  await prisma.salePayment.createMany({
    data: [
      { saleId: sale3.id, method: "CASH", amount: 6000 },
      { saleId: sale3.id, method: "CARD", amount: 5397 },
    ],
  });
  const sale4 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S004`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: outlet.id,
      subtotal: 1598,
      discount: 0,
      total: 1598,
      createdById: staffUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale4.id,
      variationId: var1p6.id,
      quantity: 2,
      unitPrice: 799,
      totalMrp: 1598,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: 1598,
    },
  });
  await prisma.salePayment.create({
    data: { saleId: sale4.id, method: "CASH", amount: 1598 },
  });
  const sale5 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S005`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member4.id,
      subtotal: 12990,
      discount: 1300,
      total: 11690,
      createdById: adminUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale5.id,
      variationId: var1p4.id,
      quantity: 2,
      unitPrice: 6000,
      totalMrp: 12000,
      discountPercent: 10,
      discountAmount: 1200,
      lineTotal: 10800,
    },
  });
  await prisma.salePayment.createMany({
    data: [{ saleId: sale5.id, method: "CASH", amount: 11690 }],
  });
  const sale6 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S006`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member1.id,
      subtotal: 4499,
      discount: 225,
      total: 4274,
      createdById: staffUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale6.id,
      variationId: var1p9.id,
      quantity: 1,
      unitPrice: 4499,
      totalMrp: 4499,
      discountPercent: 5,
      discountAmount: 225,
      lineTotal: 4274,
    },
  });
  await prisma.salePayment.create({
    data: { saleId: sale6.id, method: "CASH", amount: 4274 },
  });
  const sale7 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S007`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: showroom.id,
      subtotal: 2598,
      discount: 0,
      total: 2598,
      createdById: staffUser.id,
    },
  });
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale7.id,
        variationId: var1p7.id,
        quantity: 2,
        unitPrice: 1299,
        totalMrp: 2598,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 2598,
      },
    ],
  });
  await prisma.salePayment.create({
    data: { saleId: sale7.id, method: "QR", amount: 2598 },
  });
  const sale8 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${slug.toUpperCase()}-S008`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: outlet.id,
      memberId: member5.id,
      subtotal: 2397,
      discount: 120,
      total: 2277,
      createdById: staffUser.id,
    },
  });
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale8.id,
        variationId: var1p6.id,
        quantity: 3,
        unitPrice: 799,
        totalMrp: 2397,
        discountPercent: 5,
        discountAmount: 120,
        lineTotal: 2277,
      },
    ],
  });
  await prisma.salePayment.create({
    data: { saleId: sale8.id, method: "CASH", amount: 2277 },
  });

  // 11. PromoCodes
  const promo = await prisma.promoCode.create({
    data: {
      tenantId: tenant.id,
      code: `${slug.toUpperCase()}10`,
      description: "10% off",
      valueType: "PERCENTAGE",
      value: 10,
      overrideDiscounts: false,
      allowStacking: false,
      eligibility: "ALL",
      validFrom: now,
      validTo: periodEnd,
      usageLimit: 100,
      usageCount: 0,
      isActive: true,
    },
  });
  await prisma.promoCodeProduct.createMany({
    data: [
      { promoCodeId: promo.id, productId: product1.id },
      { promoCodeId: promo.id, productId: product2.id },
      { promoCodeId: promo.id, productId: product4.id },
      { promoCodeId: promo.id, productId: product6.id },
    ],
  });
  const promoFlat = await prisma.promoCode.create({
    data: {
      tenantId: tenant.id,
      code: `${slug.toUpperCase()}FLAT50`,
      description: "Flat 50 off",
      valueType: "FLAT",
      value: 50,
      overrideDiscounts: false,
      allowStacking: false,
      eligibility: "MEMBER",
      validFrom: now,
      validTo: periodEnd,
      usageLimit: 50,
      usageCount: 0,
      isActive: true,
    },
  });
  await prisma.promoCodeProduct.createMany({
    data: [
      { promoCodeId: promoFlat.id, productId: product6.id },
      { promoCodeId: promoFlat.id, productId: product8.id },
    ],
  });

  // 12. Tenant payment (optional)
  await prisma.tenantPayment.create({
    data: {
      tenantId: tenant.id,
      subscriptionId: subscription.id,
      amount: 2999,
      currency: "NPR",
      gateway: "KHALTI",
      status: "COMPLETED",
      paidFor: "PROFESSIONAL",
      billingCycle: "MONTHLY",
      periodStart,
      periodEnd,
      verifiedAt: now,
      verifiedBy: "seed",
    },
  });

  // 13. Audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "tenant.seeded",
        resource: "tenant",
        resourceId: tenant.id,
        details: { slug, name },
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "sale.created",
        resource: "sale",
        resourceId: sale1.id,
      },
      {
        tenantId: tenant.id,
        userId: staffUser.id,
        action: "transfer.created",
        resource: "transfer",
        resourceId: transfer2.id,
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "product.created",
        resource: "product",
        resourceId: product4.id,
      },
      {
        tenantId: tenant.id,
        userId: adminUser.id,
        action: "member.created",
        resource: "member",
        resourceId: member4.id,
      },
    ],
  });

  console.log(
    `✅ Created tenant "${slug}" (${name}) with users, categories, products, vendors, locations, members, sales, transfers, promos, subscription.`,
  );
}

async function seedDemoTenantNearLimit() {
  await deleteTenantBySlug(DEMO_TENANT_SLUG);
  console.log(`🗑️  Deleted existing tenant "${DEMO_TENANT_SLUG}" for reseed.`);

  const hashedPassword = await bcrypt.hash(DEMO_TENANT_PASSWORD, 10);
  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const tenant = await prisma.tenant.create({
    data: {
      name: DEMO_TENANT_NAME,
      slug: DEMO_TENANT_SLUG,
      plan: "BUSINESS",
      isActive: true,
      isTrial: false,
      subscriptionStatus: "ACTIVE",
      planExpiresAt: periodEnd,
      trialEndsAt: null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "BUSINESS",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: DEMO_TENANT_USERNAME,
      password: hashedPassword,
      role: "admin",
    },
  });

  const targets = {
    users: DEMO_BUSINESS_LIMITS.maxUsers - 1,
    products: DEMO_BUSINESS_LIMITS.maxProducts - 1,
    locations: DEMO_BUSINESS_LIMITS.maxLocations - 1,
    members: DEMO_BUSINESS_LIMITS.maxMembers - 1,
    categories: DEMO_BUSINESS_LIMITS.maxCategories - 1,
    contacts: DEMO_BUSINESS_LIMITS.maxContacts - 1,
  } as const;

  // Seed baseline location/category first because products depend on category.
  await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Main Warehouse",
      type: "WAREHOUSE",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });

  const primaryCategory = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Category 001",
      description: "Primary demo category",
    },
  });

  const extraUsers = Math.max(0, targets.users - 1);
  if (extraUsers > 0) {
    const usersData = Array.from({ length: extraUsers }, (_, index) => ({
      tenantId: tenant.id,
      username: `demo_user_${String(index + 1).padStart(3, "0")}`,
      password: hashedPassword,
      role: "user" as const,
    }));
    await createManyInChunks(usersData, 500, (chunk) =>
      prisma.user.createMany({ data: chunk }),
    );
  }

  const extraCategories = Math.max(0, targets.categories - 1);
  if (extraCategories > 0) {
    const categoriesData = Array.from(
      { length: extraCategories },
      (_, index) => ({
        tenantId: tenant.id,
        name: `Demo Category ${String(index + 2).padStart(3, "0")}`,
        description: "Auto-seeded demo category",
      }),
    );
    await createManyInChunks(categoriesData, 500, (chunk) =>
      prisma.category.createMany({ data: chunk }),
    );
  }

  const extraLocations = Math.max(0, targets.locations - 1);
  if (extraLocations > 0) {
    const locationsData = Array.from(
      { length: extraLocations },
      (_, index) => ({
        tenantId: tenant.id,
        name: `Demo Location ${String(index + 1).padStart(2, "0")}`,
        type: "SHOWROOM" as const,
        isActive: true,
        isDefaultWarehouse: false,
      }),
    );
    await createManyInChunks(locationsData, 200, (chunk) =>
      prisma.location.createMany({ data: chunk }),
    );
  }

  if (targets.members > 0) {
    const membersData = Array.from({ length: targets.members }, (_, index) => ({
      tenantId: tenant.id,
      phone: `98${String(index + 1).padStart(8, "0")}`,
      name: `Demo Member ${String(index + 1).padStart(5, "0")}`,
      isActive: true,
      memberStatus: "ACTIVE" as const,
      totalSales: 0,
    }));
    await createManyInChunks(membersData, 1000, (chunk) =>
      prisma.member.createMany({ data: chunk }),
    );
  }

  if (targets.products > 0) {
    const productsData = Array.from(
      { length: targets.products },
      (_, index) => ({
        tenantId: tenant.id,
        imsCode: `DEMO-P${String(index + 1).padStart(5, "0")}`,
        name: `Demo Product ${String(index + 1).padStart(5, "0")}`,
        categoryId: primaryCategory.id,
        costPrice: 100 + (index % 20),
        mrp: 200 + (index % 20),
        finalSp: 180 + (index % 20),
        createdById: demoUser.id,
      }),
    );
    await createManyInChunks(productsData, 500, (chunk) =>
      prisma.product.createMany({ data: chunk }),
    );
  }

  if (targets.contacts > 0) {
    const contactsData = Array.from(
      { length: targets.contacts },
      (_, index) => ({
        tenantId: tenant.id,
        firstName: `DemoContact${String(index + 1).padStart(4, "0")}`,
        email: `demo.contact.${index + 1}@example.com`,
        phone: `97${String(index + 1).padStart(8, "0")}`,
        ownedById: demoUser.id,
        createdById: demoUser.id,
      }),
    );
    await createManyInChunks(contactsData, 1000, (chunk) =>
      prisma.contact.createMany({ data: chunk }),
    );
  }

  const [
    usersCount,
    productsCount,
    locationsCount,
    membersCount,
    categoriesCount,
    contactsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId: tenant.id } }),
    prisma.product.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.location.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.member.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.category.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    prisma.contact.count({
      where: { owner: { tenantId: tenant.id }, deletedAt: null },
    }),
  ]);

  console.log(
    `✅ Created demo tenant "${DEMO_TENANT_SLUG}" (BUSINESS) near limits: users ${usersCount}/${DEMO_BUSINESS_LIMITS.maxUsers}, products ${productsCount}/${DEMO_BUSINESS_LIMITS.maxProducts}, locations ${locationsCount}/${DEMO_BUSINESS_LIMITS.maxLocations}, members ${membersCount}/${DEMO_BUSINESS_LIMITS.maxMembers}, categories ${categoriesCount}/${DEMO_BUSINESS_LIMITS.maxCategories}, contacts ${contactsCount}/${DEMO_BUSINESS_LIMITS.maxContacts}. Login -> X-Tenant-Slug: ${DEMO_TENANT_SLUG}, username: ${DEMO_TENANT_USERNAME}, password: ${DEMO_TENANT_PASSWORD}`,
  );
}

async function deleteTenantBySlug(slug: string) {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return;
  const tid = existing.id;
  const tenantUserIds = await prisma.user
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((rows) => rows.map((row) => row.id));
  await prisma.transferLog.deleteMany({
    where: { transfer: { tenantId: tid } },
  });
  await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
  await prisma.errorReport.deleteMany({ where: { tenantId: tid } });
  await prisma.salePayment.deleteMany({ where: { sale: { tenantId: tid } } });
  await prisma.saleItem.deleteMany({ where: { sale: { tenantId: tid } } });
  await prisma.sale.deleteMany({ where: { tenantId: tid } });
  await prisma.transferItem.deleteMany({
    where: { transfer: { tenantId: tid } },
  });
  await prisma.transfer.deleteMany({ where: { tenantId: tid } });
  const locIds = await prisma.location
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((l) => l.id));
  if (locIds.length)
    await prisma.locationInventory.deleteMany({
      where: { locationId: { in: locIds } },
    });
  const productIds = await prisma.product
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((p) => p.id));
  const variationIds = productIds.length
    ? await prisma.productVariation
        .findMany({
          where: { productId: { in: productIds } },
          select: { id: true },
        })
        .then((r) => r.map((v) => v.id))
    : [];
  if (variationIds.length) {
    await prisma.variationPhoto.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.locationInventory.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.productSubVariation.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.productVariation.deleteMany({
      where: { id: { in: variationIds } },
    });
  }
  if (productIds.length) {
    await prisma.productDiscount.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.promoCodeProduct.deleteMany({
      where: { productId: { in: productIds } },
    });
  }
  await prisma.product.deleteMany({ where: { tenantId: tid } });
  const categoryIds = await prisma.category
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((c) => c.id));
  if (categoryIds.length)
    await prisma.subCategory.deleteMany({
      where: { categoryId: { in: categoryIds } },
    });
  await prisma.category.deleteMany({ where: { tenantId: tid } });
  await prisma.discountType.deleteMany({ where: { tenantId: tid } });
  await prisma.vendor.deleteMany({ where: { tenantId: tid } });
  await prisma.location.deleteMany({ where: { tenantId: tid } });
  await prisma.member.deleteMany({ where: { tenantId: tid } });
  await prisma.promoCode.deleteMany({ where: { tenantId: tid } });
  await prisma.tenantPayment.deleteMany({ where: { tenantId: tid } });
  await prisma.subscription.deleteMany({ where: { tenantId: tid } });
  if (tenantUserIds.length) {
    const byUserIds = { in: tenantUserIds };
    await prisma.contactNote.deleteMany({
      where: { createdById: byUserIds },
    });
    await prisma.contactAttachment.deleteMany({
      where: { uploadedById: byUserIds },
    });
    await prisma.contactCommunication.deleteMany({
      where: { createdById: byUserIds },
    });
    await prisma.task.deleteMany({ where: { assignedToId: byUserIds } });
    await prisma.activity.deleteMany({ where: { createdById: byUserIds } });
    await prisma.deal.deleteMany({
      where: { OR: [{ assignedToId: byUserIds }, { createdById: byUserIds }] },
    });
    await prisma.lead.deleteMany({
      where: { OR: [{ assignedToId: byUserIds }, { createdById: byUserIds }] },
    });
    await prisma.contactTagLink.deleteMany({
      where: {
        contact: {
          OR: [{ ownedById: byUserIds }, { createdById: byUserIds }],
        },
      },
    });
    await prisma.contact.deleteMany({
      where: { OR: [{ ownedById: byUserIds }, { createdById: byUserIds }] },
    });
  }
  await prisma.user.deleteMany({ where: { tenantId: tid } });
  await prisma.tenant.delete({ where: { id: tid } });
}

const SEED_MODE = process.env.SEED_MODE ?? "development";
const isProductionSeed = SEED_MODE === "production";

/**
 * Create a minimal tenant (idempotent — skips if slug exists).
 * Used for production: platform admin creates tenants via SEED_TENANTS env.
 */
async function seedMinimalTenantIfNotExists(
  slug: string,
  name: string,
  password: string,
) {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log(`⏭️  Tenant "${slug}" already exists, skipping.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: "STARTER",
      isActive: true,
      isTrial: true,
      subscriptionStatus: "TRIAL",
      trialEndsAt: periodEnd,
      planExpiresAt: null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "STARTER",
      billingCycle: "MONTHLY",
      status: "TRIAL",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: periodEnd,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "admin",
      password: hashedPassword,
      role: "superAdmin",
    },
  });

  await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Main Location",
      type: "WAREHOUSE",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });

  await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Uncategorized",
      description: "Default category",
    },
  });

  // Default discount types for the tenant
  await prisma.discountType.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Member Discount",
        description: "Percentage off for members",
      },
      {
        tenantId: tenant.id,
        name: "Seasonal Flat",
        description: "Flat amount off",
      },
    ],
  });

  console.log(
    `✅ Created minimal tenant "${slug}" (${name}) — X-Tenant-Slug: ${slug}, username: admin`,
  );
}

/** Ruby tenant: blank slate — only tenant, admin user (admin/admin123), one location, one category. */
async function seedRubyTenant() {
  await deleteTenantBySlug("ruby");
  const hashedPassword = await bcrypt.hash(RUBY_TENANT_PASSWORD, 10);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Ruby",
      slug: "ruby",
      plan: "STARTER",
      isActive: true,
      isTrial: true,
      subscriptionStatus: "TRIAL",
      trialEndsAt: periodEnd,
      planExpiresAt: null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "STARTER",
      billingCycle: "MONTHLY",
      status: "TRIAL",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: periodEnd,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Main Location",
      type: "WAREHOUSE",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });

  await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Uncategorized",
      description: "Default category",
    },
  });

  console.log(
    `✅ Created Ruby tenant (blank slate): X-Tenant-Slug: ruby, username: admin, password: admin123`,
  );
}

async function main() {
  console.log(`🌱 Starting seed (mode: ${SEED_MODE})...\n`);

  const platformAdminPassword = requireEnv(
    "SEED_PLATFORM_ADMIN_PASSWORD",
    PLATFORM_ADMIN_PASSWORD,
  );

  // 1. System tenant (required for platform admin — User.tenantId is not nullable)
  let systemTenant = await prisma.tenant.findUnique({
    where: { slug: "system" },
  });
  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        name: "System",
        slug: "system",
        plan: "ENTERPRISE",
        isActive: true,
        isTrial: false,
        subscriptionStatus: "ACTIVE",
      },
    });
    console.log("✅ Created system tenant (for platform admin)");
  } else {
    console.log("⏭️  System tenant already exists");
  }

  // 2. Platform admin user
  let platformAdmin = await prisma.user.findFirst({
    where: {
      username: PLATFORM_ADMIN_USERNAME,
      role: "platformAdmin",
    },
  });
  if (!platformAdmin) {
    const hashedPassword = await bcrypt.hash(platformAdminPassword, 10);
    platformAdmin = await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        username: PLATFORM_ADMIN_USERNAME,
        password: hashedPassword,
        role: "platformAdmin",
      },
    });
    console.log(`✅ Created platform admin: ${platformAdmin.username}`);
  } else {
    console.log(
      `⏭️  Platform admin "${PLATFORM_ADMIN_USERNAME}" already exists`,
    );
  }

  if (isProductionSeed) {
    // Production: create only minimal tenants from SEED_TENANTS env
    // Format: slug1:Name 1,slug2:Name 2 or slug1:Name 1:password,...
    const tenantPassword = process.env.SEED_TENANT_PASSWORD ?? "ChangeMe123!";
    const tenantsEnv = process.env.SEED_TENANTS?.trim();
    if (tenantsEnv) {
      for (const part of tenantsEnv.split(",").map((s) => s.trim())) {
        if (!part) continue;
        const segments = part.split(":");
        const slug = segments[0]?.trim();
        const name = segments[1]?.trim() ?? slug;
        const password = segments[2]?.trim() ?? tenantPassword;
        if (slug) {
          await seedMinimalTenantIfNotExists(slug, name, password);
        }
      }
    } else {
      console.log(
        "⏭️  SEED_TENANTS not set — no tenants created. Add tenants via Platform Admin UI.",
      );
    }
  } else {
    // Development: full demo data
    await seedTestTenant("test1", "Test Tenant 1", TEST_TENANT_PASSWORD);
    await seedTestTenant("test2", "Test Tenant 2", TEST_TENANT_PASSWORD);
    await seedRubyTenant();
    await seedDemoTenantNearLimit();
  }

  // 5. Plan Limits (upsert so re-running seed updates existing rows)
  const planLimitsData = [
    {
      tier: "STARTER" as const,
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 2,
      maxMembers: 500,
      maxCategories: 20,
      maxContacts: 100,
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
      maxCategories: 100,
      maxContacts: 1000,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
    },
    {
      tier: "BUSINESS" as const,
      maxUsers: 25,
      maxProducts: 5000,
      maxLocations: 25,
      maxMembers: 25000,
      maxCategories: 500,
      maxContacts: 5000,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: true,
      apiAccess: true,
    },
    {
      tier: "ENTERPRISE" as const,
      maxUsers: -1,
      maxProducts: -1,
      maxLocations: -1,
      maxMembers: -1,
      maxCategories: -1,
      maxContacts: -1,
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
      update: {
        maxUsers: pl.maxUsers,
        maxProducts: pl.maxProducts,
        maxLocations: pl.maxLocations,
        maxMembers: pl.maxMembers,
        maxCategories: pl.maxCategories,
        maxContacts: pl.maxContacts,
        bulkUpload: pl.bulkUpload,
        analytics: pl.analytics,
        promoManagement: pl.promoManagement,
        auditLogs: pl.auditLogs,
        apiAccess: pl.apiAccess,
      },
      create: pl,
    });
  }
  console.log("✅ Upserted plan limits for all tiers");

  // 5b. Plan registry (metadata for each tier)
  const plansData = [
    {
      name: "Starter",
      slug: "starter",
      tier: "STARTER" as const,
      rank: 0,
      isDefault: true,
      description:
        "For small businesses getting started with inventory management",
    },
    {
      name: "Professional",
      slug: "professional",
      tier: "PROFESSIONAL" as const,
      rank: 1,
      isDefault: false,
      description:
        "For growing businesses with multiple locations and advanced features",
    },
    {
      name: "Business",
      slug: "business",
      tier: "BUSINESS" as const,
      rank: 2,
      isDefault: false,
      description:
        "For established businesses with advanced compliance and API needs",
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      tier: "ENTERPRISE" as const,
      rank: 3,
      isDefault: false,
      description:
        "Unlimited resources. Contact us for custom pricing and SLA.",
    },
  ];

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        slug: plan.slug,
        rank: plan.rank,
        description: plan.description,
      },
      create: plan,
    });
  }
  console.log("✅ Upserted plan registry");

  // 5c. Default pricing plans (NPR)
  const pricingPlansData = [
    { tier: "STARTER" as const, billingCycle: "MONTHLY" as const, price: 2999 },
    { tier: "STARTER" as const, billingCycle: "ANNUAL" as const, price: 29990 },
    {
      tier: "PROFESSIONAL" as const,
      billingCycle: "MONTHLY" as const,
      price: 6999,
    },
    {
      tier: "PROFESSIONAL" as const,
      billingCycle: "ANNUAL" as const,
      price: 69990,
    },
    {
      tier: "BUSINESS" as const,
      billingCycle: "MONTHLY" as const,
      price: 14999,
    },
    {
      tier: "BUSINESS" as const,
      billingCycle: "ANNUAL" as const,
      price: 149990,
    },
    { tier: "ENTERPRISE" as const, billingCycle: "MONTHLY" as const, price: 0 },
    { tier: "ENTERPRISE" as const, billingCycle: "ANNUAL" as const, price: 0 },
  ];
  for (const pp of pricingPlansData) {
    await prisma.pricingPlan.upsert({
      where: {
        tier_billingCycle: { tier: pp.tier, billingCycle: pp.billingCycle },
      },
      update: { price: pp.price },
      create: {
        tier: pp.tier,
        billingCycle: pp.billingCycle,
        price: pp.price,
        isActive: true,
      },
    });
  }
  console.log("✅ Upserted default pricing plans");

  // 6. Default add-on pricing
  const addOnPricingData = [
    { type: "EXTRA_USER" as const, unitPrice: 299 },
    { type: "EXTRA_PRODUCT" as const, unitPrice: 99 },
    { type: "EXTRA_LOCATION" as const, unitPrice: 499 },
    { type: "EXTRA_MEMBER" as const, unitPrice: 49 },
    { type: "EXTRA_CATEGORY" as const, unitPrice: 99 },
    { type: "EXTRA_CONTACT" as const, unitPrice: 49 },
  ];

  for (const ap of addOnPricingData) {
    const existing = await prisma.addOnPricing.findFirst({
      where: { type: ap.type, tier: null, billingCycle: "MONTHLY" },
    });
    if (existing) {
      await prisma.addOnPricing.update({
        where: { id: existing.id },
        data: { unitPrice: ap.unitPrice },
      });
    } else {
      await prisma.addOnPricing.create({
        data: {
          type: ap.type,
          tier: null,
          billingCycle: "MONTHLY",
          unitPrice: ap.unitPrice,
          minQuantity: 1,
          isActive: true,
        },
      });
    }
  }
  console.log("✅ Upserted default add-on pricing");

  // 7. Default CRM pipeline (required for Deals / Pipeline view)
  const firstTenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (firstTenant) {
    const existingPipeline = await prisma.pipeline.findFirst({
      where: { tenantId: firstTenant.id, isDefault: true },
    });
    if (!existingPipeline) {
      await prisma.pipeline.create({
        data: {
          tenantId: firstTenant.id,
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
      console.log("✅ Created default Sales Pipeline (for CRM Deals)");
    } else {
      console.log("⏭️  Default pipeline already exists");
    }
  }

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
