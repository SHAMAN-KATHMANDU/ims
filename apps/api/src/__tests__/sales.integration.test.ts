import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import app from "@/config/express.config";
import { basePrisma } from "@/config/prisma";
import { runMigrations, disconnectDb } from "@/__tests__/setup";

const TEST_SLUG = "inttest-sales";
const TEST_USERNAME = "saleuser";
const TEST_PASSWORD = "salepass123";

describe.skipIf(!process.env.DATABASE_URL)("Sales integration", () => {
  let tenantId: string;
  let userId: string;
  let locationId: string;
  let variationId: string;
  let authCookie: string;
  let saleId: string;

  beforeAll(async () => {
    await runMigrations();

    const tenant = await basePrisma.tenant.upsert({
      where: { slug: TEST_SLUG },
      create: {
        slug: TEST_SLUG,
        name: "Sales Test Tenant",
        plan: "PROFESSIONAL",
        isActive: true,
        subscriptionStatus: "ACTIVE",
      },
      update: {},
    });
    tenantId = tenant.id;

    const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await basePrisma.user.upsert({
      where: {
        tenantId_username: { tenantId, username: TEST_USERNAME },
      },
      create: {
        tenantId,
        username: TEST_USERNAME,
        password: hashed,
        role: "admin",
      },
      update: { password: hashed },
    });
    userId = user.id;

    let category = await basePrisma.category.findFirst({
      where: { tenantId, name: "Sales Test Category" },
    });
    if (!category) {
      category = await basePrisma.category.create({
        data: { tenantId, name: "Sales Test Category" },
      });
    }

    let location = await basePrisma.location.findFirst({
      where: { tenantId, name: "Sales Showroom", type: "SHOWROOM" },
    });
    if (!location) {
      location = await basePrisma.location.create({
        data: {
          tenantId,
          name: "Sales Showroom",
          type: "SHOWROOM",
          isActive: true,
        },
      });
    }
    locationId = location.id;

    const product = await basePrisma.product.create({
      data: {
        tenant: { connect: { id: tenantId } },
        category: { connect: { id: category.id } },
        location: { connect: { id: locationId } },
        createdBy: { connect: { id: userId } },
        imsCode: `SALE-PROD-${Date.now()}`,
        name: "Sales Test Product",
        mrp: 100,
        costPrice: 60,
      },
    });

    const variation = await basePrisma.productVariation.create({
      data: {
        productId: product.id,
        color: "Red",
        stockQuantity: 0,
      },
    });
    variationId = variation.id;

    const existingInv = await basePrisma.locationInventory.findFirst({
      where: { locationId, variationId, subVariationId: null },
    });
    if (existingInv) {
      await basePrisma.locationInventory.update({
        where: { id: existingInv.id },
        data: { quantity: 50 },
      });
    } else {
      await basePrisma.locationInventory.create({
        data: {
          locationId,
          variationId,
          subVariationId: null,
          quantity: 50,
        },
      });
    }

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const setCookie = loginRes.headers["set-cookie"];
    authCookie = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
  }, 30000);

  afterAll(async () => {
    await disconnectDb();
  });

  it("POST /api/v1/sales/preview returns 200 with subtotal, discount, total", async () => {
    const res = await request(app)
      .post("/api/v1/sales/preview")
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({
        locationId,
        items: [{ variationId, quantity: 2 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.subtotal).toBe("number");
    expect(typeof res.body.data.discount).toBe("number");
    expect(typeof res.body.data.total).toBe("number");
    expect(res.body.data.subtotal).toBe(200);
    expect(res.body.data.total).toBeLessThanOrEqual(res.body.data.subtotal);
  });

  it("POST /api/v1/sales creates sale and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/sales")
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({
        locationId,
        items: [{ variationId, quantity: 1 }],
        payments: [{ method: "CASH", amount: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.sale).toBeDefined();
    expect(res.body.data.sale.id).toBeDefined();
    expect(res.body.data.sale.saleCode).toBeDefined();
    expect(Number(res.body.data.sale.total)).toBe(100);
    saleId = res.body.data.sale.id;
  });

  it("GET /api/v1/sales returns list with pagination", async () => {
    const res = await request(app)
      .get("/api/v1/sales")
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(typeof res.body.pagination.totalItems).toBe("number");
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.find((s: { id: string }) => s.id === saleId);
    expect(found).toBeDefined();
  });

  it("GET /api/v1/sales/:id returns sale by id", async () => {
    const res = await request(app)
      .get(`/api/v1/sales/${saleId}`)
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.sale).toBeDefined();
    expect(res.body.data.sale.id).toBe(saleId);
    expect(res.body.data.sale.location).toBeDefined();
    expect(Array.isArray(res.body.data.sale.items)).toBe(true);
  });

  it("POST /api/v1/sales/preview without auth returns 401", async () => {
    const res = await request(app)
      .post("/api/v1/sales/preview")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({
        locationId,
        items: [{ variationId, quantity: 1 }],
      });

    expect(res.status).toBe(401);
    if (res.body.success !== undefined) expect(res.body.success).toBe(false);
    expect(res.body.error ?? res.body.message).toBeDefined();
  });
});
