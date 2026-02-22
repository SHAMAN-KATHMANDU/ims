import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import app from "@/config/express.config";
import { basePrisma } from "@/config/prisma";
import { runMigrations, disconnectDb } from "@/__tests__/setup";

const TEST_SLUG = "inttest-auth";
const TEST_USERNAME = "intuser";
const TEST_PASSWORD = "intpass123";

describe("Auth flow integration", () => {
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    await runMigrations();
    const tenant = await basePrisma.tenant.upsert({
      where: { slug: TEST_SLUG },
      create: {
        slug: TEST_SLUG,
        name: "Integration Test Tenant",
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
      update: { password: hashed, failedLoginAttempts: 0, lockedUntil: null },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it("POST /api/v1/auth/login with valid credentials returns 200 with user and tenant", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(TEST_USERNAME);
    expect(res.body.tenant).toBeDefined();
    expect(res.body.tenant.slug).toBe(TEST_SLUG);
    expect(res.body.token).toBeUndefined();
    expect(res.body.accessToken).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = res.headers["set-cookie"];
    expect(
      Array.isArray(cookies)
        ? cookies.some((c: string) => c.startsWith("access_token="))
        : (cookies as string).startsWith("access_token="),
    ).toBe(true);
  });

  it("POST /api/v1/auth/login with wrong password returns 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ username: TEST_USERNAME, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid|password/i);
  });

  it("POST /api/v1/auth/login with locked account returns 429", async () => {
    await basePrisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + 20 * 60 * 1000),
        failedLoginAttempts: 5,
      },
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/locked|try again/i);

    await basePrisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
  });

  it("GET /api/v1/auth/me with valid cookie returns 200 with user", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Tenant-Slug", TEST_SLUG)
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join("; ")
      : setCookie;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookieHeader)
      .set("X-Tenant-Slug", TEST_SLUG);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.username).toBe(TEST_USERNAME);
  });

  it("GET /api/v1/auth/me without token returns 401", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("X-Tenant-Slug", TEST_SLUG);

    expect(res.status).toBe(401);
  });
});
