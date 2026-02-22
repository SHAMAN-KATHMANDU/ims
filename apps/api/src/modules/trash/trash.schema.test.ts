import { describe, expect, it } from "vitest";
import { trashEntityParamsSchema, trashListQuerySchema } from "./trash.schema";

describe("trash schemas", () => {
  it("validates trashListQuerySchema", () => {
    const parsed = trashListQuerySchema.parse({
      page: "2",
      limit: "25",
      entityType: "Product",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
    expect(parsed.entityType).toBe("product");
  });

  it("validates trashEntityParamsSchema", () => {
    const parsed = trashEntityParamsSchema.parse({
      entityType: "Lead",
      id: "abc-123",
    });
    expect(parsed.entityType).toBe("lead");
    expect(parsed.id).toBe("abc-123");
  });

  it("rejects invalid entityType", () => {
    const result = trashEntityParamsSchema.safeParse({
      entityType: "unknown",
      id: "id-1",
    });
    expect(result.success).toBe(false);
  });
});
