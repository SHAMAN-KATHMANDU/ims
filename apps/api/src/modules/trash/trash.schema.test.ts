import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListTrashQuerySchema,
  RestoreItemParamsSchema,
  PermanentlyDeleteParamsSchema,
} from "./trash.schema";

describe("ListTrashQuerySchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts empty query with defaults", () => {
    const result = ListTrashQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.entityType).toBeUndefined();
  });

  it("accepts valid page and limit", () => {
    const result = ListTrashQuerySchema.parse({ page: "2", limit: "20" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
  });

  it("accepts valid entityType", () => {
    const result = ListTrashQuerySchema.parse({
      entityType: "product",
    });
    expect(result.entityType).toBe("product");
  });

  it("transforms entityType to lowercase", () => {
    const result = ListTrashQuerySchema.parse({
      entityType: "Product",
    });
    expect(result.entityType).toBe("product");
  });

  it("rejects invalid entityType", () => {
    expect(() =>
      ListTrashQuerySchema.parse({ entityType: "invalid" }),
    ).toThrow();
  });

  it("rejects limit over 100", () => {
    expect(() => ListTrashQuerySchema.parse({ limit: "500" })).toThrow();
  });
});

describe("RestoreItemParamsSchema", () => {
  it("accepts valid entityType and uuid id", () => {
    const result = RestoreItemParamsSchema.parse({
      entityType: "product",
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.entityType).toBe("product");
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("transforms entityType to lowercase", () => {
    const result = RestoreItemParamsSchema.parse({
      entityType: "Category",
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.entityType).toBe("category");
  });

  it("rejects invalid uuid", () => {
    expect(() =>
      RestoreItemParamsSchema.parse({
        entityType: "product",
        id: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("rejects invalid entityType", () => {
    expect(() =>
      RestoreItemParamsSchema.parse({
        entityType: "unknown",
        id: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });
});

describe("PermanentlyDeleteParamsSchema", () => {
  it("accepts valid entityType and uuid id", () => {
    const result = PermanentlyDeleteParamsSchema.parse({
      entityType: "member",
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.entityType).toBe("member");
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects invalid uuid", () => {
    expect(() =>
      PermanentlyDeleteParamsSchema.parse({
        entityType: "product",
        id: "short",
      }),
    ).toThrow();
  });
});
