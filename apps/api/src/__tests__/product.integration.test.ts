import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import app from "@/config/express.config";
import { basePrisma } from "@/config/prisma";
import { runMigrations, disconnectDb } from "@/__tests__/setup";

const TEST_SLUG = "inttest-product";
const TEST_USERNAME = "produser";
const TEST_PASSWORD = "prodpass123";
const TEST_IMS_CODE = `INT-PROD-${Date.now()}`;

// Skip when DATABASE_URL is not set (e.g. CI without a test DB) to avoid Prisma init error
describe.skipIf(!process.env.DATABASE_URL)("Product CRUD integration", () => {
  let tenantId: string;
  let userId: string;
  let categoryId: string;
  let locationId: string;
  let authCookie: string;
  let productId: string;

  beforeAll(async () => {
    await runMigrations();
    const tenant = await basePrisma.tenant.upsert({
      where: { slug: TEST_SLUG },
      create: {
        slug: TEST_SLUG,
        name: "Product Test Tenant",
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
      where: { tenantId, name: "Test Category" },
    });
    if (!category) {
      category = await basePrisma.category.create({
        data: { tenantId, name: "Test Category" },
      });
    }
    categoryId = category.id;

    let location = await basePrisma.location.findFirst({
      where: { tenantId, name: "Test Location" },
    });
    if (!location) {
      location = await basePrisma.location.create({
        data: {
          tenantId,
          name: "Test Location",
          type: "WAREHOUSE",
          isActive: true,
        },
      });
    }
    locationId = location.id;

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

  it("POST /api/v1/products with valid data returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/products")
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({
        imsCode: TEST_IMS_CODE,
        name: "Integration Test Product",
        categoryId,
        locationId,
        costPrice: 100,
        mrp: 150,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.product).toBeDefined();
    expect(res.body.data.product.imsCode).toBe(TEST_IMS_CODE);
    expect(res.body.data.product.name).toBe("Integration Test Product");
    productId = res.body.data.product.id;
  });

  it("POST /api/v1/products with duplicate IMS code returns 409", async () => {
    const res = await request(app)
      .post("/api/v1/products")
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({
        imsCode: TEST_IMS_CODE,
        name: "Another Product",
        categoryId,
        locationId,
        costPrice: 200,
        mrp: 250,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists|IMS code/i);
  });

  it("GET /api/v1/products/:id returns correct product", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${productId}`)
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.product).toBeDefined();
    expect(res.body.data.product.id).toBe(productId);
    expect(res.body.data.product.imsCode).toBe(TEST_IMS_CODE);
  });

  it("PUT /api/v1/products/:id updates product fields", async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ name: "Updated Integration Product", mrp: 199 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.product.name).toBe("Updated Integration Product");
    expect(Number(res.body.data.product.mrp)).toBe(199);
  });

  it("DELETE /api/v1/products/:id soft-deletes (sets deletedAt)", async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set("Cookie", authCookie)
      .set("X-Tenant-Slug", TEST_SLUG);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await basePrisma.product.findUnique({
      where: { id: productId },
    });
    expect(found).not.toBeNull();
    expect(found?.deletedAt).not.toBeNull();
  });
});
