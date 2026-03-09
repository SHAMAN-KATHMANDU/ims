/**
 * Phase 8 — Property-based / schema fuzz tests.
 * Verifies Zod schemas accept valid inputs and reject invalid ones.
 * Invariants: discount ≤ total (where applicable), payments amount ≥ 0.
 * Uses manual fuzz cases (fast-check optional per plan).
 */

import { describe, it, expect } from "vitest";
import { CreateCategorySchema } from "@/modules/categories/category.schema";
import {
  CreateSaleSchema,
  AddPaymentSchema,
} from "@/modules/sales/sale.schema";
import { CreateUserSchema } from "@/modules/users/user.schema";
import {
  ListTrashQuerySchema,
  RestoreItemParamsSchema,
} from "@/modules/trash/trash.schema";
import {
  BulkUploadQuerySchema,
  BulkDownloadQuerySchema,
} from "@/modules/bulk/bulk.schema";
import { GetAllProductsQuerySchema } from "@/modules/products/product.schema";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ─── CreateCategorySchema ────────────────────────────────────────────────────

describe("CreateCategorySchema - valid inputs", () => {
  const validCases = [
    { name: "a", description: undefined },
    { name: "Electronics", description: "Tech stuff" },
    { name: "A".repeat(100), description: "" },
    { name: "Test", description: "A".repeat(500) },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateCategorySchema - invalid inputs", () => {
  const invalidCases = [
    { name: "", description: "ok" },
    { name: "a", description: 123 },
    { name: "a".repeat(101), description: "ok" },
    { name: "ok", description: "a".repeat(501) },
    {},
    { name: null },
    { name: 42 },
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = CreateCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ─── CreateSaleSchema ────────────────────────────────────────────────────────

describe("CreateSaleSchema - valid inputs", () => {
  const validCases = [
    {
      locationId: VALID_UUID,
      items: [{ variationId: VALID_UUID, quantity: 1 }],
    },
    {
      locationId: VALID_UUID,
      items: [
        { variationId: VALID_UUID, quantity: 2 },
        { variationId: VALID_UUID, quantity: 3 },
      ],
    },
    {
      locationId: VALID_UUID,
      memberPhone: "+9779812345678",
      items: [{ variationId: VALID_UUID, quantity: 1 }],
      payments: [{ method: "CASH" as const, amount: 100 }],
    },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateSaleSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateSaleSchema - invalid inputs", () => {
  const invalidCases = [
    {
      locationId: "not-uuid",
      items: [{ variationId: VALID_UUID, quantity: 1 }],
    },
    { locationId: VALID_UUID, items: [] },
    {
      locationId: VALID_UUID,
      items: [{ variationId: VALID_UUID, quantity: 0 }],
    },
    { locationId: VALID_UUID, items: [{ variationId: "x", quantity: 1 }] },
    {},
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = CreateSaleSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ─── AddPaymentSchema invariants ─────────────────────────────────────────────

describe("AddPaymentSchema - invariants", () => {
  it("amount must be positive (invariant: amount > 0)", () => {
    expect(
      AddPaymentSchema.safeParse({ method: "CASH", amount: 0.01 }).success,
    ).toBe(true);
    expect(
      AddPaymentSchema.safeParse({ method: "CASH", amount: 0 }).success,
    ).toBe(false);
    expect(
      AddPaymentSchema.safeParse({ method: "CASH", amount: -1 }).success,
    ).toBe(false);
  });

  it("valid payment methods only", () => {
    const validMethods = ["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"];
    for (const method of validMethods) {
      expect(AddPaymentSchema.safeParse({ method, amount: 100 }).success).toBe(
        true,
      );
    }
    expect(
      AddPaymentSchema.safeParse({ method: "BITCOIN", amount: 100 }).success,
    ).toBe(false);
  });
});

// ─── CreateUserSchema ────────────────────────────────────────────────────────

describe("CreateUserSchema - valid inputs", () => {
  const validCases = [
    { username: "user1", password: "password123", role: "user" as const },
    { username: "Admin", password: "x".repeat(6), role: "admin" as const },
    { username: "a", password: "123456", role: "platformAdmin" as const },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateUserSchema - invalid inputs", () => {
  const invalidCases = [
    { username: "", password: "pass123", role: "user" },
    { username: "u", password: "short", role: "user" },
    { username: "u", password: "pass123", role: "superuser" },
    {},
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = CreateUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ─── Trash schemas ───────────────────────────────────────────────────────────

describe("ListTrashQuerySchema - valid inputs", () => {
  const validCases = [
    {},
    { page: 1, limit: 10 },
    { entityType: "product", tenantId: VALID_UUID },
    { page: 2, limit: 50, entityType: "category" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = ListTrashQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("RestoreItemParamsSchema - valid inputs", () => {
  const validCases = [
    { entityType: "product", id: VALID_UUID },
    { entityType: "category", id: VALID_UUID },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = RestoreItemParamsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

// ─── Bulk schemas ────────────────────────────────────────────────────────────

describe("BulkUploadQuerySchema - valid inputs", () => {
  const validCases = [
    { type: "products" },
    { type: "members" },
    { type: "sales" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = BulkUploadQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("BulkDownloadQuerySchema - valid inputs", () => {
  const validCases = [
    { type: "products" as const },
    { type: "products", format: "xlsx" as const },
    { type: "products", format: "csv" as const },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = BulkDownloadQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

// ─── GetAllProductsQuerySchema ───────────────────────────────────────────────

describe("GetAllProductsQuerySchema - valid inputs", () => {
  const validCases = [
    {},
    { page: 1, limit: 20 },
    { search: "laptop", categoryId: VALID_UUID },
    { lowStock: "true" },
    { lowStock: "false" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = GetAllProductsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

// ─── DeleteBodySchema ────────────────────────────────────────────────────────

describe("DeleteBodySchema - valid inputs", () => {
  const validCases = [
    {},
    { reason: undefined },
    { reason: "Duplicate entry" },
    { reason: "A".repeat(500) },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = DeleteBodySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("DeleteBodySchema - invalid inputs", () => {
  const invalidCases = [{ reason: "a".repeat(501) }, { reason: 123 }];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = DeleteBodySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
