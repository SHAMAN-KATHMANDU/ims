/**
 * Phase 4 — Edge case expansion: schema tests.
 * Null/undefined, empty strings, boundary values, malformed UUIDs.
 */

import { describe, it, expect } from "vitest";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/modules/categories/category.schema";
import {
  CreateSaleSchema,
  AddPaymentSchema,
  GetAllSalesQuerySchema,
} from "@/modules/sales/sale.schema";
import {
  CreateUserSchema,
  UpdateUserSchema,
} from "@/modules/users/user.schema";
import {
  ListTrashQuerySchema,
  RestoreItemParamsSchema,
  PermanentlyDeleteParamsSchema,
} from "@/modules/trash/trash.schema";
import {
  BulkUploadQuerySchema,
  BulkDownloadQuerySchema,
} from "@/modules/bulk/bulk.schema";
import { CreatePromoSchema } from "@/modules/promos/promo.schema";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Edge cases — null/undefined", () => {
  it("CreateCategorySchema rejects null name", () => {
    expect(CreateCategorySchema.safeParse({ name: null }).success).toBe(false);
  });

  it("CreateCategorySchema rejects undefined name", () => {
    expect(CreateCategorySchema.safeParse({}).success).toBe(false);
  });

  it("CreateSaleSchema rejects null locationId", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: null,
        items: [{ variationId: VALID_UUID, quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("CreateUserSchema rejects undefined username", () => {
    expect(
      CreateUserSchema.safeParse({
        password: "password123",
        role: "user",
      }).success,
    ).toBe(false);
  });

  it("DeleteBodySchema accepts undefined reason", () => {
    const r = DeleteBodySchema.safeParse({});
    expect(r.success).toBe(true);
  });
});

describe("Edge cases — empty strings", () => {
  it("CreateCategorySchema rejects empty name", () => {
    expect(CreateCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("UpdateCategorySchema rejects empty name when provided", () => {
    expect(UpdateCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("CreateSaleSchema rejects empty items array", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: VALID_UUID,
        items: [],
      }).success,
    ).toBe(false);
  });

  it("CreateUserSchema rejects empty username", () => {
    expect(
      CreateUserSchema.safeParse({
        username: "",
        password: "password123",
        role: "user",
      }).success,
    ).toBe(false);
  });
});

describe("Edge cases — boundary values", () => {
  it("CreateCategorySchema accepts name at max 100 chars", () => {
    const r = CreateCategorySchema.safeParse({ name: "a".repeat(100) });
    expect(r.success).toBe(true);
  });

  it("CreateCategorySchema rejects name at 101 chars", () => {
    expect(
      CreateCategorySchema.safeParse({ name: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("CreateCategorySchema accepts description at max 500 chars", () => {
    const r = CreateCategorySchema.safeParse({
      name: "Valid",
      description: "x".repeat(500),
    });
    expect(r.success).toBe(true);
  });

  it("CreateSaleSchema accepts quantity of 1 (min positive)", () => {
    const r = CreateSaleSchema.safeParse({
      locationId: VALID_UUID,
      items: [{ variationId: VALID_UUID, quantity: 1 }],
    });
    expect(r.success).toBe(true);
  });

  it("CreateSaleSchema rejects quantity of 0", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: VALID_UUID,
        items: [{ variationId: VALID_UUID, quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("CreateSaleSchema rejects negative quantity", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: VALID_UUID,
        items: [{ variationId: VALID_UUID, quantity: -1 }],
      }).success,
    ).toBe(false);
  });

  it("AddPaymentSchema rejects amount of 0 (must be positive)", () => {
    expect(
      AddPaymentSchema.safeParse({ method: "CASH", amount: 0 }).success,
    ).toBe(false);
  });

  it("AddPaymentSchema rejects negative amount", () => {
    expect(
      AddPaymentSchema.safeParse({ method: "CASH", amount: -1 }).success,
    ).toBe(false);
  });

  it("GetAllSalesQuerySchema accepts limit at max 100", () => {
    const r = GetAllSalesQuerySchema.safeParse({ limit: 100 });
    expect(r.success).toBe(true);
  });

  it("GetAllSalesQuerySchema rejects limit above 100", () => {
    expect(GetAllSalesQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false,
    );
  });

  it("DeleteBodySchema rejects reason over 500 chars", () => {
    expect(
      DeleteBodySchema.safeParse({ reason: "a".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("Edge cases — malformed UUIDs", () => {
  const badUuids = [
    "not-a-uuid",
    "550e8400-e29b-41d4-a716", // too short
    "550e8400-e29b-41d4-a716-446655440000-extra", // too long
    "550e8400e29b41d4a716446655440000", // no hyphens
    "gggggggg-gggg-gggg-gggg-gggggggggggg", // invalid hex
    "",
    "null",
    "undefined",
  ];

  it.each(badUuids)("CreateSaleSchema rejects malformed UUID: %s", (bad) => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: bad,
        items: [{ variationId: VALID_UUID, quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("CreateSaleSchema rejects malformed variationId in items", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: VALID_UUID,
        items: [{ variationId: "not-a-uuid", quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("RestoreItemParamsSchema rejects malformed id", () => {
    expect(
      RestoreItemParamsSchema.safeParse({
        entityType: "product",
        id: "invalid",
      }).success,
    ).toBe(false);
  });

  it("PermanentlyDeleteParamsSchema rejects malformed id", () => {
    expect(
      PermanentlyDeleteParamsSchema.safeParse({
        entityType: "category",
        id: "x",
      }).success,
    ).toBe(false);
  });
});

describe("Edge cases — wrong types", () => {
  it("CreateCategorySchema rejects name as number", () => {
    expect(CreateCategorySchema.safeParse({ name: 42 }).success).toBe(false);
  });

  it("CreateCategorySchema rejects description as number", () => {
    expect(
      CreateCategorySchema.safeParse({ name: "Valid", description: 123 })
        .success,
    ).toBe(false);
  });

  it("CreateSaleSchema rejects quantity as string", () => {
    expect(
      CreateSaleSchema.safeParse({
        locationId: VALID_UUID,
        items: [{ variationId: VALID_UUID, quantity: "2" }],
      }).success,
    ).toBe(false);
  });

  it("CreateUserSchema rejects role as invalid enum", () => {
    expect(
      CreateUserSchema.safeParse({
        username: "user1",
        password: "pass123",
        role: "superuser",
      }).success,
    ).toBe(false);
  });
});

describe("Trash schema edge cases", () => {
  it("ListTrashQuerySchema accepts valid entityType", () => {
    const r = ListTrashQuerySchema.safeParse({
      page: 1,
      limit: 10,
      entityType: "product",
    });
    expect(r.success).toBe(true);
  });

  it("ListTrashQuerySchema rejects invalid entityType", () => {
    expect(
      ListTrashQuerySchema.safeParse({
        entityType: "invalid",
      }).success,
    ).toBe(false);
  });

  it("RestoreItemParamsSchema accepts valid entityType and id", () => {
    const r = RestoreItemParamsSchema.safeParse({
      entityType: "category",
      id: VALID_UUID,
    });
    expect(r.success).toBe(true);
  });
});

describe("Bulk schema edge cases", () => {
  it("BulkUploadQuerySchema accepts type products", () => {
    const r = BulkUploadQuerySchema.safeParse({ type: "products" });
    expect(r.success).toBe(true);
  });

  it("BulkUploadQuerySchema accepts case-insensitive type", () => {
    const r = BulkUploadQuerySchema.safeParse({ type: "PRODUCTS" });
    expect(r.success).toBe(true);
  });

  it("BulkUploadQuerySchema rejects invalid type", () => {
    expect(BulkUploadQuerySchema.safeParse({ type: "invoices" }).success).toBe(
      false,
    );
  });

  it("BulkDownloadQuerySchema accepts format xlsx and csv", () => {
    expect(
      BulkDownloadQuerySchema.safeParse({ type: "products", format: "xlsx" })
        .success,
    ).toBe(true);
    expect(
      BulkDownloadQuerySchema.safeParse({ type: "products", format: "csv" })
        .success,
    ).toBe(true);
  });
});

describe("UpdateUserSchema edge cases", () => {
  it("rejects empty object (at least one field required)", () => {
    expect(UpdateUserSchema.safeParse({}).success).toBe(false);
  });

  it("accepts partial update with only username", () => {
    const r = UpdateUserSchema.safeParse({ username: "newname" });
    expect(r.success).toBe(true);
  });
});

describe("Promo schema time edge cases", () => {
  it("CreatePromoSchema accepts validFrom and validTo as ISO strings", () => {
    const r = CreatePromoSchema.safeParse({
      code: "SAVE10",
      valueType: "PERCENTAGE",
      value: 10,
      validFrom: "2025-01-01T00:00:00Z",
      validTo: "2025-12-31T23:59:59Z",
    });
    expect(r.success).toBe(true);
  });

  it("CreatePromoSchema accepts null validFrom", () => {
    const r = CreatePromoSchema.safeParse({
      code: "SAVE10",
      valueType: "PERCENTAGE",
      value: 10,
      validFrom: null,
      validTo: null,
    });
    expect(r.success).toBe(true);
  });
});
