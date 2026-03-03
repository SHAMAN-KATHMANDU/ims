import { describe, it, expect } from "vitest";
import {
  CreateTransferSchema,
  GetAllTransfersQuerySchema,
  CancelTransferSchema,
} from "./transfer.schema";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("CreateTransferSchema", () => {
  it("accepts valid create payload", () => {
    const result = CreateTransferSchema.parse({
      fromLocationId: validUuid,
      toLocationId: "550e8400-e29b-41d4-a716-446655440001",
      items: [
        { variationId: validUuid, quantity: 5 },
        {
          variationId: "550e8400-e29b-41d4-a716-446655440002",
          subVariationId: "550e8400-e29b-41d4-a716-446655440003",
          quantity: 2,
        },
      ],
      notes: "Urgent transfer",
    });
    expect(result.fromLocationId).toBe(validUuid);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].subVariationId).toBeUndefined();
    expect(result.items[1].subVariationId).toBe(
      "550e8400-e29b-41d4-a716-446655440003",
    );
    expect(result.notes).toBe("Urgent transfer");
  });

  it("accepts minimal payload without notes", () => {
    const result = CreateTransferSchema.parse({
      fromLocationId: validUuid,
      toLocationId: "550e8400-e29b-41d4-a716-446655440001",
      items: [{ variationId: validUuid, quantity: 1 }],
    });
    expect(result.notes).toBeUndefined();
  });

  it("coerces quantity to number", () => {
    const result = CreateTransferSchema.parse({
      fromLocationId: validUuid,
      toLocationId: "550e8400-e29b-41d4-a716-446655440001",
      items: [{ variationId: validUuid, quantity: "10" }],
    });
    expect(result.items[0].quantity).toBe(10);
  });

  it("rejects when from and to locations are the same", () => {
    expect(() =>
      CreateTransferSchema.parse({
        fromLocationId: validUuid,
        toLocationId: validUuid,
        items: [{ variationId: validUuid, quantity: 1 }],
      }),
    ).toThrow();
  });

  it("rejects when items array is empty", () => {
    expect(() =>
      CreateTransferSchema.parse({
        fromLocationId: validUuid,
        toLocationId: "550e8400-e29b-41d4-a716-446655440001",
        items: [],
      }),
    ).toThrow();
  });

  it("rejects when variationId is invalid UUID", () => {
    expect(() =>
      CreateTransferSchema.parse({
        fromLocationId: validUuid,
        toLocationId: "550e8400-e29b-41d4-a716-446655440001",
        items: [{ variationId: "not-a-uuid", quantity: 1 }],
      }),
    ).toThrow();
  });

  it("rejects when quantity is zero or negative", () => {
    expect(() =>
      CreateTransferSchema.parse({
        fromLocationId: validUuid,
        toLocationId: "550e8400-e29b-41d4-a716-446655440001",
        items: [{ variationId: validUuid, quantity: 0 }],
      }),
    ).toThrow();
    expect(() =>
      CreateTransferSchema.parse({
        fromLocationId: validUuid,
        toLocationId: "550e8400-e29b-41d4-a716-446655440001",
        items: [{ variationId: validUuid, quantity: -1 }],
      }),
    ).toThrow();
  });
});

describe("GetAllTransfersQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = GetAllTransfersQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe("createdAt");
    expect(result.search).toBe("");
  });

  it("accepts full query with filters", () => {
    const result = GetAllTransfersQuerySchema.parse({
      page: "2",
      limit: "20",
      sortBy: "status",
      sortOrder: "desc",
      search: "TRF",
      status: "PENDING",
      fromLocationId: validUuid,
      toLocationId: "550e8400-e29b-41d4-a716-446655440001",
      locationId: validUuid,
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("status");
    expect(result.sortOrder).toBe("desc");
    expect(result.search).toBe("TRF");
    expect(result.status).toBe("PENDING");
    expect(result.fromLocationId).toBe(validUuid);
    expect(result.locationId).toBe(validUuid);
  });

  it("transforms sortOrder to asc when not desc", () => {
    const result = GetAllTransfersQuerySchema.parse({
      sortOrder: "asc",
    });
    expect(result.sortOrder).toBe("asc");
  });

  it("transforms sortOrder to asc when invalid value", () => {
    const result = GetAllTransfersQuerySchema.parse({
      sortOrder: "invalid",
    });
    expect(result.sortOrder).toBe("asc");
  });
});

describe("CancelTransferSchema", () => {
  it("accepts empty object", () => {
    const result = CancelTransferSchema.parse({});
    expect(result.reason).toBeUndefined();
  });

  it("accepts reason", () => {
    const result = CancelTransferSchema.parse({
      reason: "Wrong items selected",
    });
    expect(result.reason).toBe("Wrong items selected");
  });

  it("rejects reason longer than 500 chars", () => {
    expect(() =>
      CancelTransferSchema.parse({
        reason: "a".repeat(501),
      }),
    ).toThrow();
  });
});
