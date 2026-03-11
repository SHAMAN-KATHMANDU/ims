/**
 * Phase 3.7 — Property-based / schema fuzz tests.
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
import {
  GetAllProductsQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  GetProductByImsQuerySchema,
  CreateDiscountTypeSchema,
} from "@/modules/products/product.schema";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  JwtPayloadSchema,
} from "@/modules/auth/auth.schema";
import {
  CreateTransferSchema,
  GetAllTransfersQuerySchema,
  CancelTransferSchema,
} from "@/modules/transfers/transfer.schema";
import {
  AdjustInventorySchema,
  SetInventorySchema,
} from "@/modules/inventory/inventory.schema";
import {
  CreateLocationSchema,
  UpdateLocationSchema,
} from "@/modules/locations/location.schema";
import {
  CreatePromoSchema,
  PromoListQuerySchema,
} from "@/modules/promos/promo.schema";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "550e8400-e29b-41d4-a716-446655440001";

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

// ─── Auth schemas ────────────────────────────────────────────────────────────

describe("LoginSchema - valid inputs", () => {
  const validCases = [
    { username: "admin", password: "secret123" },
    { username: "  ADMIN  ", password: "x" },
    { username: "a", password: "1" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = LoginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("LoginSchema - invalid inputs", () => {
  const invalidCases = [
    { username: "", password: "pass" },
    { username: "  ", password: "pass" },
    { password: "pass" },
    { username: "u" },
    {},
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = LoginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("RegisterSchema - valid inputs", () => {
  const validCases = [
    { username: "user1", password: "password123", role: "user" as const },
    { username: "Admin", password: "x".repeat(8), role: "admin" as const },
    { username: "a", password: "12345678" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = RegisterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("RegisterSchema - invalid inputs", () => {
  const invalidCases = [
    { username: "", password: "pass12345", role: "user" },
    { username: "u", password: "short", role: "user" },
    { username: "u", password: "12345678", role: "superuser" },
    {},
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = RegisterSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("ChangePasswordSchema - valid/invalid", () => {
  it("accepts valid passwords", () => {
    expect(
      ChangePasswordSchema.safeParse({
        currentPassword: "old",
        newPassword: "newpass123",
      }).success,
    ).toBe(true);
  });

  it("rejects short new password", () => {
    expect(
      ChangePasswordSchema.safeParse({
        currentPassword: "old",
        newPassword: "short",
      }).success,
    ).toBe(false);
  });
});

describe("JwtPayloadSchema - valid/invalid", () => {
  it("accepts valid payload", () => {
    expect(
      JwtPayloadSchema.safeParse({
        id: "u1",
        role: "admin",
        tenantId: "t1",
        tenantSlug: "acme",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid role", () => {
    expect(
      JwtPayloadSchema.safeParse({
        id: "u1",
        role: "invalid",
        tenantId: "t1",
        tenantSlug: "acme",
      }).success,
    ).toBe(false);
  });
});

// ─── Product schemas ─────────────────────────────────────────────────────────

describe("CreateProductSchema - valid inputs", () => {
  const validCases = [
    {
      imsCode: "P-001",
      name: "Widget",
      categoryId: VALID_UUID,
      costPrice: 10,
      mrp: 15,
      variations: [{ stockQuantity: 1 }],
    },
    {
      imsCode: "A".repeat(100),
      name: "X",
      categoryId: VALID_UUID,
      costPrice: 0.01,
      mrp: 0.02,
      variations: [{ stockQuantity: 0 }],
    },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateProductSchema - invalid inputs", () => {
  const invalidCases = [
    {
      imsCode: "",
      name: "X",
      categoryId: VALID_UUID,
      costPrice: 1,
      mrp: 2,
      variations: [{ stockQuantity: 1 }],
    },
    {
      imsCode: "P1",
      name: "",
      categoryId: VALID_UUID,
      costPrice: 1,
      mrp: 2,
      variations: [{ stockQuantity: 1 }],
    },
    {
      imsCode: "P1",
      name: "X",
      categoryId: "not-uuid",
      costPrice: 1,
      mrp: 2,
      variations: [{ stockQuantity: 1 }],
    },
    {
      imsCode: "P1",
      name: "X",
      categoryId: VALID_UUID,
      costPrice: 1,
      mrp: 2,
      variations: [],
    },
    {},
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = CreateProductSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("UpdateProductSchema - valid inputs", () => {
  const validCases = [
    { name: "Updated" },
    { costPrice: 99, mrp: 149 },
    { variations: [{ stockQuantity: 5 }] },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = UpdateProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("GetProductByImsQuerySchema - valid/invalid", () => {
  it("accepts valid query", () => {
    expect(
      GetProductByImsQuerySchema.safeParse({ imsCode: "P-001" }).success,
    ).toBe(true);
    expect(
      GetProductByImsQuerySchema.safeParse({
        imsCode: "BARCODE",
        locationId: VALID_UUID,
      }).success,
    ).toBe(true);
  });

  it("rejects empty imsCode", () => {
    expect(GetProductByImsQuerySchema.safeParse({ imsCode: "" }).success).toBe(
      false,
    );
    expect(GetProductByImsQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe("CreateDiscountTypeSchema - valid/invalid", () => {
  it("accepts valid input", () => {
    expect(
      CreateDiscountTypeSchema.safeParse({
        name: "Member",
        description: "For members",
        defaultPercentage: 10,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid percentage", () => {
    expect(
      CreateDiscountTypeSchema.safeParse({
        name: "X",
        defaultPercentage: 101,
      }).success,
    ).toBe(false);
  });
});

// ─── Transfer schemas ────────────────────────────────────────────────────────

describe("CreateTransferSchema - valid inputs", () => {
  const validCases = [
    {
      fromLocationId: VALID_UUID,
      toLocationId: VALID_UUID_2,
      items: [{ variationId: VALID_UUID, quantity: 1 }],
    },
    {
      fromLocationId: VALID_UUID,
      toLocationId: VALID_UUID_2,
      items: [
        { variationId: VALID_UUID, quantity: 5 },
        { variationId: VALID_UUID_2, quantity: 3 },
      ],
      notes: "Stock move",
    },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateTransferSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateTransferSchema - invalid inputs and invariants", () => {
  it("rejects same source and destination (invariant)", () => {
    const result = CreateTransferSchema.safeParse({
      fromLocationId: VALID_UUID,
      toLocationId: VALID_UUID,
      items: [{ variationId: VALID_UUID_2, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty items", () => {
    expect(
      CreateTransferSchema.safeParse({
        fromLocationId: VALID_UUID,
        toLocationId: VALID_UUID_2,
        items: [],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid quantity", () => {
    expect(
      CreateTransferSchema.safeParse({
        fromLocationId: VALID_UUID,
        toLocationId: VALID_UUID_2,
        items: [{ variationId: VALID_UUID, quantity: 0 }],
      }).success,
    ).toBe(false);
  });
});

describe("GetAllTransfersQuerySchema - valid inputs", () => {
  const validCases = [
    {},
    { page: 1, limit: 20 },
    { status: "PENDING" as const, fromLocationId: VALID_UUID },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = GetAllTransfersQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CancelTransferSchema - valid inputs", () => {
  it("accepts optional reason", () => {
    expect(CancelTransferSchema.safeParse({}).success).toBe(true);
    expect(
      CancelTransferSchema.safeParse({ reason: "Duplicate" }).success,
    ).toBe(true);
  });

  it("rejects reason over 500 chars", () => {
    expect(
      CancelTransferSchema.safeParse({ reason: "a".repeat(501) }).success,
    ).toBe(false);
  });
});

// ─── Inventory schemas ───────────────────────────────────────────────────────

describe("AdjustInventorySchema - valid inputs", () => {
  const validCases = [
    {
      locationId: VALID_UUID,
      variationId: VALID_UUID_2,
      quantity: 5,
    },
    {
      locationId: "loc1",
      variationId: "var1",
      quantity: -3,
      reason: "Damaged",
    },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = AdjustInventorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("SetInventorySchema - valid/invalid", () => {
  it("accepts non-negative quantity", () => {
    expect(
      SetInventorySchema.safeParse({
        locationId: VALID_UUID,
        variationId: VALID_UUID_2,
        quantity: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects negative quantity (invariant)", () => {
    expect(
      SetInventorySchema.safeParse({
        locationId: VALID_UUID,
        variationId: VALID_UUID_2,
        quantity: -1,
      }).success,
    ).toBe(false);
  });
});

// ─── Location schemas ────────────────────────────────────────────────────────

describe("CreateLocationSchema - valid inputs", () => {
  const validCases = [
    { name: "Main Warehouse", type: "WAREHOUSE" as const },
    { name: "A", type: "SHOWROOM" as const, address: "123 St" },
    { name: "X".repeat(255) },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreateLocationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateLocationSchema - invalid inputs", () => {
  const invalidCases = [
    { name: "" },
    { name: "X".repeat(256) },
    { name: "Ok", type: "INVALID" },
  ];

  invalidCases.forEach((input, i) => {
    it(`rejects invalid case ${i + 1}`, () => {
      const result = CreateLocationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ─── Promo schemas ───────────────────────────────────────────────────────────

describe("CreatePromoSchema - valid inputs", () => {
  const validCases = [
    { code: "SAVE10", valueType: "PERCENTAGE" as const, value: 10 },
    {
      code: "FLAT5",
      valueType: "FLAT" as const,
      value: 5,
      eligibility: "MEMBER" as const,
    },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = CreatePromoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("CreatePromoSchema - invalid inputs", () => {
  it("rejects empty code", () => {
    expect(
      CreatePromoSchema.safeParse({
        code: "",
        valueType: "PERCENTAGE",
        value: 10,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid valueType", () => {
    expect(
      CreatePromoSchema.safeParse({
        code: "X",
        valueType: "INVALID",
        value: 10,
      }).success,
    ).toBe(false);
  });
});

describe("PromoListQuerySchema - valid inputs", () => {
  const validCases = [
    {},
    { page: 1, limit: 20 },
    { search: "SAVE", isActive: "true" },
  ];

  validCases.forEach((input, i) => {
    it(`accepts valid case ${i + 1}`, () => {
      const result = PromoListQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
