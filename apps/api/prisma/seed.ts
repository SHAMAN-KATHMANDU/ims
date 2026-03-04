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

  const pre = slug.toUpperCase();
  const var1p1 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P001-Brown`,
      productId: product1.id,
      stockQuantity: 10,
    },
  });
  const var2p1 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P001-White`,
      productId: product1.id,
      stockQuantity: 5,
    },
  });
  const var1p2 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P002-Natural`,
      productId: product2.id,
      stockQuantity: 8,
    },
  });
  const var1p3 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P003-White`,
      productId: product3.id,
      stockQuantity: 50,
    },
  });
  const var1p4 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P004-Oak`,
      productId: product4.id,
      stockQuantity: 12,
    },
  });
  const var2p4 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P004-Walnut`,
      productId: product4.id,
      stockQuantity: 8,
    },
  });
  const var1p5 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P005-Black`,
      productId: product5.id,
      stockQuantity: 40,
    },
  });
  const var2p5 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P005-White`,
      productId: product5.id,
      stockQuantity: 35,
    },
  });
  const var1p6 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P006-Navy`,
      productId: product6.id,
      stockQuantity: 100,
    },
  });
  const var2p6 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P006-Black`,
      productId: product6.id,
      stockQuantity: 80,
    },
  });
  const var1p7 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P007-Silver`,
      productId: product7.id,
      stockQuantity: 25,
    },
  });
  const var1p8 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P008-Black`,
      productId: product8.id,
      stockQuantity: 30,
    },
  });
  const var1p9 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P009-Grey`,
      productId: product9.id,
      stockQuantity: 15,
    },
  });
  const var1p10 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P010-Black`,
      productId: product10.id,
      stockQuantity: 45,
    },
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

const DEMO_PASSWORD = "demo";

/** Demo tenant: slug demo, username demo, password demo — full seed including CRM, AttributeTypes, ErrorReports, Notifications. */
async function seedDemoTenant() {
  const slug = "demo";
  const name = "Demo Account";

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    await deleteTenantBySlug(slug);
    console.log(
      `🗑️  Deleted existing tenant "${slug}" to reseed with full data.`,
    );
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

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

  const demoUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "demo",
      password: hashedPassword,
      role: "admin",
    },
  });

  const pre = "DEMO";

  // Categories + SubCategories
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
  const subCatAccessories = await prisma.subCategory.findFirst({
    where: { categoryId: cat2.id, name: "Accessories" },
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
    ],
  });
  const subCatMen = await prisma.subCategory.findFirst({
    where: { categoryId: cat3.id, name: "Men" },
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
  const subCatCookware = await prisma.subCategory.findFirst({
    where: { categoryId: cat4.id, name: "Cookware" },
  });
  const subCatDecor = await prisma.subCategory.findFirst({
    where: { categoryId: cat4.id, name: "Decor" },
  });

  // Vendors
  const vendor1 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Vendor A",
      contact: "Vendor Contact",
      phone: "9810000001",
      address: "Kathmandu",
    },
  });
  const vendor2 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Vendor B",
      contact: "Vendor B Contact",
      phone: "9810000002",
    },
  });
  const vendor3 = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Vendor C",
      contact: "Vendor C Contact",
      phone: "9810000003",
      address: "Lalitpur",
    },
  });

  // Locations
  const warehouse = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Main Warehouse",
      type: "WAREHOUSE",
      address: "Warehouse St 1",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });
  const showroom = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Showroom",
      type: "SHOWROOM",
      address: "Showroom Ave 1",
      isActive: true,
      isDefaultWarehouse: false,
    },
  });
  const outlet = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Outlet",
      type: "SHOWROOM",
      address: "Outlet Park",
      isActive: true,
      isDefaultWarehouse: false,
    },
  });

  // DiscountTypes
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

  // AttributeTypes + AttributeValues
  const attrColor = await prisma.attributeType.create({
    data: {
      tenantId: tenant.id,
      name: "Color",
      code: "color",
      displayOrder: 0,
    },
  });
  const attrSize = await prisma.attributeType.create({
    data: {
      tenantId: tenant.id,
      name: "Size",
      code: "size",
      displayOrder: 1,
    },
  });
  const valBrown = await prisma.attributeValue.create({
    data: { attributeTypeId: attrColor.id, value: "Brown", displayOrder: 0 },
  });
  const valWhite = await prisma.attributeValue.create({
    data: { attributeTypeId: attrColor.id, value: "White", displayOrder: 1 },
  });
  const valBlack = await prisma.attributeValue.create({
    data: { attributeTypeId: attrColor.id, value: "Black", displayOrder: 2 },
  });
  const valNavy = await prisma.attributeValue.create({
    data: { attributeTypeId: attrColor.id, value: "Navy", displayOrder: 3 },
  });
  const valS = await prisma.attributeValue.create({
    data: { attributeTypeId: attrSize.id, value: "S", displayOrder: 0 },
  });
  const valM = await prisma.attributeValue.create({
    data: { attributeTypeId: attrSize.id, value: "M", displayOrder: 1 },
  });
  const valL = await prisma.attributeValue.create({
    data: { attributeTypeId: attrSize.id, value: "L", displayOrder: 2 },
  });

  // Products
  const product1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Wooden Sofa",
      categoryId: cat1.id,
      subCategory: "Sofas",
      subCategoryId: subCatSofas?.id ?? null,
      description: "Classic wooden sofa",
      costPrice: 25000,
      mrp: 35000,
      finalSp: 32000,
      vendorId: vendor1.id,
      createdById: demoUser.id,
    },
  });
  const product2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Dining Table",
      categoryId: cat1.id,
      subCategory: "Tables",
      subCategoryId: subCatTables?.id ?? null,
      costPrice: 18000,
      mrp: 25000,
      finalSp: 23000,
      vendorId: vendor1.id,
      createdById: demoUser.id,
    },
  });
  const product3 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "LED Lamp",
      categoryId: cat2.id,
      subCategory: "Accessories",
      subCategoryId: subCatAccessories?.id ?? null,
      costPrice: 500,
      mrp: 800,
      finalSp: 750,
      vendorId: vendor2.id,
      createdById: demoUser.id,
    },
  });
  const product4 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Bookshelf",
      categoryId: cat1.id,
      subCategory: "Tables",
      subCategoryId: subCatTables?.id ?? null,
      costPrice: 4500,
      mrp: 6500,
      finalSp: 6000,
      vendorId: vendor1.id,
      createdById: demoUser.id,
    },
  });
  const product5 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Wireless Earbuds",
      categoryId: cat2.id,
      subCategory: "Accessories",
      subCategoryId: subCatAccessories?.id ?? null,
      costPrice: 1200,
      mrp: 1999,
      finalSp: 1799,
      vendorId: vendor2.id,
      createdById: demoUser.id,
    },
  });
  const product6 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Cotton T-Shirt",
      categoryId: cat3.id,
      subCategory: "Men",
      subCategoryId: subCatMen?.id ?? null,
      costPrice: 400,
      mrp: 899,
      finalSp: 799,
      vendorId: vendor3.id,
      createdById: demoUser.id,
    },
  });
  const product7 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Non-Stick Pan",
      categoryId: cat4.id,
      subCategory: "Cookware",
      subCategoryId: subCatCookware?.id ?? null,
      costPrice: 800,
      mrp: 1499,
      finalSp: 1299,
      vendorId: vendor3.id,
      createdById: demoUser.id,
    },
  });
  const product8 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Wall Clock",
      categoryId: cat4.id,
      subCategory: "Decor",
      subCategoryId: subCatDecor?.id ?? null,
      costPrice: 350,
      mrp: 699,
      finalSp: 599,
      vendorId: vendor1.id,
      createdById: demoUser.id,
    },
  });
  const product9 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Desk Chair",
      categoryId: cat1.id,
      subCategory: "Sofas",
      subCategoryId: subCatSofas?.id ?? null,
      costPrice: 3200,
      mrp: 4999,
      finalSp: 4499,
      vendorId: vendor1.id,
      createdById: demoUser.id,
    },
  });
  const product10 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: "Power Bank",
      categoryId: cat2.id,
      subCategory: "Accessories",
      subCategoryId: subCatAccessories?.id ?? null,
      costPrice: 900,
      mrp: 1599,
      finalSp: 1399,
      vendorId: vendor2.id,
      createdById: demoUser.id,
    },
  });

  // ProductAttributeType links (products 1, 6 use Color; product 6 uses Size)
  await prisma.productAttributeType.createMany({
    data: [
      {
        productId: product1.id,
        attributeTypeId: attrColor.id,
        displayOrder: 0,
      },
      {
        productId: product6.id,
        attributeTypeId: attrColor.id,
        displayOrder: 0,
      },
      { productId: product6.id, attributeTypeId: attrSize.id, displayOrder: 1 },
    ],
  });

  // Variations
  const var1p1 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P001-Brown`,
      productId: product1.id,
      stockQuantity: 10,
    },
  });
  const var2p1 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P001-White`,
      productId: product1.id,
      stockQuantity: 5,
    },
  });
  const var1p2 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P002-Natural`,
      productId: product2.id,
      stockQuantity: 8,
    },
  });
  const var1p3 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P003-White`,
      productId: product3.id,
      stockQuantity: 50,
    },
  });
  const var1p4 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P004-Oak`,
      productId: product4.id,
      stockQuantity: 12,
    },
  });
  const var2p4 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P004-Walnut`,
      productId: product4.id,
      stockQuantity: 8,
    },
  });
  const var1p5 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P005-Black`,
      productId: product5.id,
      stockQuantity: 40,
    },
  });
  const var2p5 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P005-White`,
      productId: product5.id,
      stockQuantity: 35,
    },
  });
  const var1p6 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P006-Navy`,
      productId: product6.id,
      stockQuantity: 100,
    },
  });
  const var2p6 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P006-Black`,
      productId: product6.id,
      stockQuantity: 80,
    },
  });
  const var1p7 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P007-Silver`,
      productId: product7.id,
      stockQuantity: 25,
    },
  });
  const var1p8 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P008-Black`,
      productId: product8.id,
      stockQuantity: 30,
    },
  });
  const var1p9 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P009-Grey`,
      productId: product9.id,
      stockQuantity: 15,
    },
  });
  const var1p10 = await prisma.productVariation.create({
    data: {
      tenantId: tenant.id,
      imsCode: `${pre}-P010-Black`,
      productId: product10.id,
      stockQuantity: 45,
    },
  });

  // ProductVariationAttribute (EAV for some variations)
  await prisma.productVariationAttribute.createMany({
    data: [
      {
        variationId: var1p1.id,
        attributeTypeId: attrColor.id,
        attributeValueId: valBrown.id,
      },
      {
        variationId: var2p1.id,
        attributeTypeId: attrColor.id,
        attributeValueId: valWhite.id,
      },
      {
        variationId: var1p6.id,
        attributeTypeId: attrColor.id,
        attributeValueId: valNavy.id,
      },
      {
        variationId: var2p6.id,
        attributeTypeId: attrColor.id,
        attributeValueId: valBlack.id,
      },
    ],
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
      photoUrl: "https://picsum.photos/seed/sofa1/400/400",
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

  // LocationInventory — every variation at one+ locations
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

  // Members
  const member1 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000001",
      name: "Ram Sharma",
      email: "ram@example.com",
      notes: "VIP customer",
      isActive: true,
      memberStatus: "VIP",
      totalSales: 0,
      memberSince: now,
    },
  });
  const member2 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000002",
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
      phone: "9800000003",
      name: "Gita Karki",
      email: "gita@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member4 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000004",
      name: "Krishna Thapa",
      email: "krishna@example.com",
      memberStatus: "VIP",
      totalSales: 0,
    },
  });
  const member5 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000005",
      name: "Anita Gurung",
      email: "anita@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member6 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000006",
      name: "Bikash Rai",
      memberStatus: "PROSPECT",
      totalSales: 0,
    },
  });
  const member7 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000007",
      name: "Puja Maharjan",
      email: "puja@example.com",
      memberStatus: "ACTIVE",
      totalSales: 0,
    },
  });
  const member8 = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      phone: "9800000008",
      name: "Rajesh Shrestha",
      email: "rajesh@example.com",
      memberStatus: "INACTIVE",
      totalSales: 0,
    },
  });

  // Transfers — valid (source has stock) and trackable
  const transfer1 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${pre}-TRF-001`,
      fromLocationId: warehouse.id,
      toLocationId: showroom.id,
      status: "COMPLETED",
      notes: "Initial stock transfer",
      createdById: demoUser.id,
      approvedById: demoUser.id,
      approvedAt: now,
      completedAt: now,
    },
  });
  await prisma.transferItem.createMany({
    data: [
      {
        transferId: transfer1.id,
        variationId: var1p1.id,
        subVariationId: subVar1.id,
        quantity: 2,
      },
      { transferId: transfer1.id, variationId: var1p3.id, quantity: 10 },
    ],
  });
  await prisma.transferLog.createMany({
    data: [
      {
        transferId: transfer1.id,
        action: "created",
        details: {},
        userId: demoUser.id,
      },
      {
        transferId: transfer1.id,
        action: "approved",
        details: {},
        userId: demoUser.id,
      },
      {
        transferId: transfer1.id,
        action: "completed",
        details: {},
        userId: demoUser.id,
      },
    ],
  });

  const transfer2 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${pre}-TRF-002`,
      fromLocationId: warehouse.id,
      toLocationId: outlet.id,
      status: "COMPLETED",
      notes: "Stock for outlet",
      createdById: demoUser.id,
      approvedById: demoUser.id,
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
        userId: demoUser.id,
      },
      {
        transferId: transfer2.id,
        action: "approved",
        details: {},
        userId: demoUser.id,
      },
      {
        transferId: transfer2.id,
        action: "completed",
        details: {},
        userId: demoUser.id,
      },
    ],
  });

  const transfer3 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${pre}-TRF-003`,
      fromLocationId: warehouse.id,
      toLocationId: showroom.id,
      status: "PENDING",
      notes: "Pending approval",
      createdById: demoUser.id,
    },
  });
  await prisma.transferItem.createMany({
    data: [
      { transferId: transfer3.id, variationId: var1p5.id, quantity: 5 },
      { transferId: transfer3.id, variationId: var1p9.id, quantity: 3 },
    ],
  });
  await prisma.transferLog.create({
    data: {
      transferId: transfer3.id,
      action: "created",
      details: {},
      userId: demoUser.id,
    },
  });

  const transfer4 = await prisma.transfer.create({
    data: {
      tenantId: tenant.id,
      transferCode: `${pre}-TRF-004`,
      fromLocationId: showroom.id,
      toLocationId: outlet.id,
      status: "IN_TRANSIT",
      notes: "In transit",
      createdById: demoUser.id,
      approvedById: demoUser.id,
      approvedAt: now,
    },
  });
  await prisma.transferItem.createMany({
    data: [{ transferId: transfer4.id, variationId: var1p4.id, quantity: 1 }],
  });
  await prisma.transferLog.createMany({
    data: [
      {
        transferId: transfer4.id,
        action: "created",
        details: {},
        userId: demoUser.id,
      },
      {
        transferId: transfer4.id,
        action: "approved",
        details: {},
        userId: demoUser.id,
      },
    ],
  });

  // Sales
  const sale1 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${pre}-S001`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member1.id,
      subtotal: 64000,
      discount: 3200,
      total: 60800,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S002`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: showroom.id,
      subtotal: 750,
      discount: 0,
      total: 750,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S003`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member3.id,
      subtotal: 11997,
      discount: 600,
      total: 11397,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S004`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: outlet.id,
      subtotal: 1598,
      discount: 0,
      total: 1598,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S005`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member4.id,
      subtotal: 12990,
      discount: 1300,
      total: 11690,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S006`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: showroom.id,
      memberId: member1.id,
      subtotal: 4499,
      discount: 225,
      total: 4274,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S007`,
      type: "GENERAL",
      isCreditSale: false,
      locationId: showroom.id,
      subtotal: 2598,
      discount: 0,
      total: 2598,
      createdById: demoUser.id,
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
      saleCode: `${pre}-S008`,
      type: "MEMBER",
      isCreditSale: false,
      locationId: outlet.id,
      memberId: member5.id,
      subtotal: 2397,
      discount: 120,
      total: 2277,
      createdById: demoUser.id,
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

  const sale9 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${pre}-S009`,
      type: "GENERAL",
      isCreditSale: true,
      locationId: showroom.id,
      subtotal: 15000,
      discount: 0,
      total: 15000,
      createdById: demoUser.id,
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale9.id,
      variationId: var1p2.id,
      quantity: 1,
      unitPrice: 15000,
      totalMrp: 15000,
      discountPercent: 0,
      discountAmount: 0,
      lineTotal: 15000,
    },
  });

  const sale10 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      saleCode: `${pre}-S010`,
      type: "MEMBER",
      isCreditSale: true,
      locationId: showroom.id,
      memberId: member2.id,
      subtotal: 9000,
      discount: 0,
      total: 9000,
      createdById: demoUser.id,
    },
  });
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale10.id,
        variationId: var1p4.id,
        quantity: 1,
        unitPrice: 6000,
        totalMrp: 6000,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 6000,
      },
      {
        saleId: sale10.id,
        variationId: var1p3.id,
        quantity: 4,
        unitPrice: 750,
        totalMrp: 3000,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 3000,
      },
    ],
  });

  // PromoCodes
  const promo = await prisma.promoCode.create({
    data: {
      tenantId: tenant.id,
      code: "DEMO10",
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
      code: "DEMOFLAT50",
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

  // CRM: CrmSource, CrmJourneyType
  await prisma.crmSource.createMany({
    data: [
      { tenantId: tenant.id, name: "Website" },
      { tenantId: tenant.id, name: "Referral" },
      { tenantId: tenant.id, name: "Cold Call" },
      { tenantId: tenant.id, name: "Trade Show" },
    ],
  });
  await prisma.crmJourneyType.createMany({
    data: [
      { tenantId: tenant.id, name: "New" },
      { tenantId: tenant.id, name: "Nurturing" },
      { tenantId: tenant.id, name: "Ready" },
    ],
  });

  // Companies
  const company1 = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: "Acme Corp",
      website: "https://acme.com",
      phone: "01-4123456",
      address: "Kathmandu",
    },
  });
  const company2 = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: "Beta Solutions",
      website: "https://beta.io",
      phone: "01-4987654",
    },
  });
  const company3 = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: "Gamma Industries",
      address: "Lalitpur",
    },
  });

  // ContactTags
  const tagVip = await prisma.contactTag.create({
    data: { tenantId: tenant.id, name: "VIP" },
  });
  const tagHot = await prisma.contactTag.create({
    data: { tenantId: tenant.id, name: "Hot Lead" },
  });
  const tagFollowUp = await prisma.contactTag.create({
    data: { tenantId: tenant.id, name: "Follow Up" },
  });

  // Pipeline (default)
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
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

  // Contacts (some linked to Members)
  const contact1 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Ram",
      lastName: "Sharma",
      email: "ram@example.com",
      phone: "9800000001",
      companyId: company1.id,
      memberId: member1.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Website",
      journeyType: "Ready",
    },
  });
  const contact2 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Sita",
      lastName: "Devi",
      email: "sita@example.com",
      phone: "9800000002",
      companyId: company1.id,
      memberId: member2.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Referral",
      journeyType: "Nurturing",
    },
  });
  const contact3 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Krishna",
      lastName: "Thapa",
      email: "krishna@example.com",
      phone: "9800000004",
      companyId: company2.id,
      memberId: member4.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Trade Show",
      journeyType: "New",
    },
  });
  const contact4 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Anita",
      lastName: "Gurung",
      email: "anita@example.com",
      phone: "9800000005",
      companyId: company2.id,
      memberId: member5.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Cold Call",
      journeyType: "Ready",
    },
  });
  const contact5 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Bikash",
      lastName: "Rai",
      email: "bikash@example.com",
      phone: "9800000006",
      companyId: company3.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Website",
      journeyType: "New",
    },
  });
  const contact6 = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      firstName: "Puja",
      lastName: "Maharjan",
      email: "puja@example.com",
      phone: "9800000007",
      memberId: member7.id,
      ownedById: demoUser.id,
      createdById: demoUser.id,
      source: "Referral",
    },
  });

  await prisma.contactTagLink.createMany({
    data: [
      { contactId: contact1.id, tagId: tagVip.id },
      { contactId: contact2.id, tagId: tagHot.id },
      { contactId: contact3.id, tagId: tagVip.id },
      { contactId: contact5.id, tagId: tagFollowUp.id },
    ],
  });

  await prisma.contactNote.createMany({
    data: [
      {
        contactId: contact1.id,
        content: "Interested in bulk order. Follow up next week.",
        createdById: demoUser.id,
      },
      {
        contactId: contact2.id,
        content: "Requested product catalog.",
        createdById: demoUser.id,
      },
      {
        contactId: contact3.id,
        content: "VIP customer — priority support.",
        createdById: demoUser.id,
      },
    ],
  });

  await prisma.contactCommunication.createMany({
    data: [
      {
        contactId: contact1.id,
        type: "CALL",
        subject: "Initial discovery call",
        notes: "Discussed requirements.",
        createdById: demoUser.id,
      },
      {
        contactId: contact2.id,
        type: "EMAIL",
        subject: "Catalog sent",
        createdById: demoUser.id,
      },
      {
        contactId: contact3.id,
        type: "MEETING",
        subject: "Site visit",
        notes: "Showed showroom.",
        createdById: demoUser.id,
      },
    ],
  });

  // Leads
  const lead1 = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: "New Prospect Alpha",
      email: "alpha@example.com",
      phone: "9811111111",
      status: "NEW",
      source: "Website",
      notes: "Filled form on website",
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });
  const lead2 = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: "Prospect Beta",
      email: "beta@example.com",
      status: "CONTACTED",
      source: "Referral",
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });
  const lead3 = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: "Prospect Gamma",
      email: "gamma@example.com",
      phone: "9811111113",
      status: "QUALIFIED",
      source: "Cold Call",
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });
  const lead4 = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: "Lost Lead Delta",
      status: "LOST",
      source: "Website",
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });

  const stageQualification = "Qualification";
  const stageProposal = "Proposal";
  const stageNegotiation = "Negotiation";
  const stageWon = "Closed Won";
  const stageLost = "Closed Lost";

  // Deals (some from converted Leads)
  const deal1 = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      name: "Acme Corp - Furniture Deal",
      value: 150000,
      stage: stageProposal,
      probability: 30,
      status: "OPEN",
      expectedCloseDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      contactId: contact1.id,
      memberId: member1.id,
      companyId: company1.id,
      pipelineId: pipeline.id,
      assignedToId: demoUser.id,
      createdById: demoUser.id,
      leadId: null,
    },
  });
  const lead5 = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: "Converted Lead Epsilon",
      email: "epsilon@example.com",
      status: "CONVERTED",
      source: "Website",
      assignedToId: demoUser.id,
      createdById: demoUser.id,
      convertedAt: now,
    },
  });
  const deal2 = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      name: "Epsilon - Enterprise Deal",
      value: 500000,
      stage: stageWon,
      probability: 100,
      status: "WON",
      closedAt: now,
      contactId: null,
      companyId: company2.id,
      pipelineId: pipeline.id,
      assignedToId: demoUser.id,
      createdById: demoUser.id,
      leadId: lead5.id,
    },
  });
  const deal3 = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      name: "Gamma - Lost Deal",
      value: 25000,
      stage: stageLost,
      probability: 0,
      status: "LOST",
      lostReason: "Budget constraints",
      contactId: contact5.id,
      companyId: company3.id,
      pipelineId: pipeline.id,
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });
  const deal4 = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      name: "Beta Solutions - Ongoing",
      value: 75000,
      stage: stageNegotiation,
      probability: 60,
      status: "OPEN",
      expectedCloseDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      contactId: contact4.id,
      memberId: member5.id,
      companyId: company2.id,
      pipelineId: pipeline.id,
      assignedToId: demoUser.id,
      createdById: demoUser.id,
    },
  });

  // Tasks
  const task1 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      title: "Follow up with Ram Sharma",
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      contactId: contact1.id,
      dealId: deal1.id,
      assignedToId: demoUser.id,
    },
  });
  const task2 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      title: "Send proposal to Beta Solutions",
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      dealId: deal4.id,
      assignedToId: demoUser.id,
    },
  });
  const task3 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      title: "Call Bikash Rai",
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      completed: true,
      contactId: contact5.id,
      assignedToId: demoUser.id,
    },
  });

  // Activities
  await prisma.activity.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "CALL",
        subject: "Discovery call",
        notes: "Discussed requirements.",
        activityAt: now,
        contactId: contact1.id,
        dealId: deal1.id,
        createdById: demoUser.id,
      },
      {
        tenantId: tenant.id,
        type: "MEETING",
        subject: "Showroom visit",
        activityAt: now,
        contactId: contact3.id,
        createdById: demoUser.id,
      },
      {
        tenantId: tenant.id,
        type: "CALL",
        subject: "Negotiation call",
        activityAt: now,
        dealId: deal4.id,
        createdById: demoUser.id,
      },
    ],
  });

  // Link 1-2 sales to Contact
  await prisma.sale.update({
    where: { id: sale1.id },
    data: { contactId: contact1.id },
  });
  await prisma.sale.update({
    where: { id: sale5.id },
    data: { contactId: contact3.id },
  });

  // ErrorReports
  await prisma.errorReport.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        title: "Page load slow on Analytics",
        description: "Analytics page takes >5s to load",
        pageUrl: "/demo/analytics",
        status: "OPEN",
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        title: "Export fails for large dataset",
        description: "CSV export fails when >1000 rows",
        pageUrl: "/demo/sales",
        status: "REVIEWED",
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        title: "Minor UI glitch",
        description: "Button alignment on mobile",
        pageUrl: "/demo/products",
        status: "RESOLVED",
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        title: "Transfer approval notification not received",
        description: "User did not get email when transfer was approved",
        pageUrl: "/demo/transfers",
        status: "OPEN",
      },
    ],
  });

  // TenantPayment
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

  // AuditLogs
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "tenant.seeded",
        resource: "tenant",
        resourceId: tenant.id,
        details: { slug, name },
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "sale.created",
        resource: "sale",
        resourceId: sale1.id,
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "transfer.created",
        resource: "transfer",
        resourceId: transfer2.id,
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "product.created",
        resource: "product",
        resourceId: product4.id,
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "member.created",
        resource: "member",
        resourceId: member4.id,
      },
      {
        tenantId: tenant.id,
        userId: demoUser.id,
        action: "deal.created",
        resource: "deal",
        resourceId: deal1.id,
      },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        type: "TASK_DUE",
        title: "Task due soon",
        message: "Follow up with Ram Sharma is due in 3 days",
        resourceType: "task",
        resourceId: task1.id,
      },
      {
        userId: demoUser.id,
        type: "DEAL_STAGE_CHANGE",
        title: "Deal won",
        message: "Epsilon - Enterprise Deal moved to Closed Won",
        resourceType: "deal",
        resourceId: deal2.id,
      },
      {
        userId: demoUser.id,
        type: "LEAD_ASSIGNMENT",
        title: "New lead assigned",
        message: "New Prospect Alpha assigned to you",
        resourceType: "lead",
        resourceId: lead1.id,
      },
    ],
  });

  // Member totalSales aggregation (from seeded sales)
  const memberSales = [
    { memberId: member1.id, total: 60800 + 4274 },
    { memberId: member2.id, total: 9000 },
    { memberId: member3.id, total: 11397 },
    { memberId: member4.id, total: 11690 },
    { memberId: member5.id, total: 2277 },
  ];
  for (const { memberId, total } of memberSales) {
    await prisma.member.update({
      where: { id: memberId },
      data: { totalSales: total },
    });
  }

  console.log(
    `✅ Created demo tenant (slug: demo) with full seed — username: demo, password: demo`,
  );
}

async function deleteTenantBySlug(slug: string) {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return;
  const tid = existing.id;
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

  // CRM entities (order matters for FKs)
  const userIds = await prisma.user
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((u) => u.id));
  if (userIds.length) {
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
  }
  await prisma.activity.deleteMany({ where: { tenantId: tid } });
  await prisma.task.deleteMany({ where: { tenantId: tid } });
  await prisma.deal.deleteMany({ where: { tenantId: tid } });
  await prisma.lead.deleteMany({ where: { tenantId: tid } });
  const contactIds = await prisma.contact
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((c) => c.id));
  if (contactIds.length) {
    await prisma.contactNote.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactAttachment.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactCommunication.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactTagLink.deleteMany({
      where: { contactId: { in: contactIds } },
    });
  }
  await prisma.contact.deleteMany({ where: { tenantId: tid } });
  await prisma.company.deleteMany({ where: { tenantId: tid } });
  await prisma.contactTag.deleteMany({ where: { tenantId: tid } });
  await prisma.pipeline.deleteMany({ where: { tenantId: tid } });
  await prisma.crmSource.deleteMany({ where: { tenantId: tid } });
  await prisma.crmJourneyType.deleteMany({ where: { tenantId: tid } });

  // EAV attribute types (AttributeValue -> AttributeType)
  const attrTypeIds = await prisma.attributeType
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((a) => a.id));
  if (attrTypeIds.length) {
    await prisma.attributeValue.deleteMany({
      where: { attributeTypeId: { in: attrTypeIds } },
    });
    await prisma.attributeType.deleteMany({ where: { tenantId: tid } });
  }

  await prisma.member.deleteMany({ where: { tenantId: tid } });
  await prisma.promoCode.deleteMany({ where: { tenantId: tid } });
  await prisma.tenantPayment.deleteMany({ where: { tenantId: tid } });
  await prisma.subscription.deleteMany({ where: { tenantId: tid } });
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
      `⚠️  Platform admin "${PLATFORM_ADMIN_USERNAME}" already exists.`,
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
    const skipDemo = process.env.SEED_DEMO === "false";
    if (!skipDemo) {
      await seedDemoTenant();
    }
  }

  // 5. Default CRM pipeline per tenant (required for Deals / Pipeline view)
  const allTenants = await prisma.tenant.findMany({
    where: { slug: { not: "system" } },
    select: { id: true, slug: true },
  });
  const defaultStages = [
    { id: "1", name: "Qualification", order: 1, probability: 10 },
    { id: "2", name: "Proposal", order: 2, probability: 30 },
    { id: "3", name: "Negotiation", order: 3, probability: 60 },
    { id: "4", name: "Closed Won", order: 4, probability: 100 },
    { id: "5", name: "Closed Lost", order: 5, probability: 0 },
  ];
  for (const t of allTenants) {
    const existing = await prisma.pipeline.findFirst({
      where: { tenantId: t.id, isDefault: true },
    });
    if (!existing) {
      await prisma.pipeline.create({
        data: {
          tenantId: t.id,
          name: "Sales Pipeline",
          isDefault: true,
          stages: defaultStages,
        },
      });
    }
  }
  if (allTenants.length > 0) {
    console.log("✅ Created default Sales Pipeline for each tenant");
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
