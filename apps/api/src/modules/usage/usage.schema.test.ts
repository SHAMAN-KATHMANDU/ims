import { describe, it, expect } from "vitest";
import { requestAddOnSchema, usageResourceParamsSchema } from "./usage.schema";

describe("usage schemas", () => {
  it("validates requestAddOnSchema", () => {
    const parsed = requestAddOnSchema.parse({
      type: "EXTRA_USER",
      quantity: "2",
      notes: "  Need additional seats ",
    });

    expect(parsed.type).toBe("EXTRA_USER");
    expect(parsed.quantity).toBe(2);
    expect(parsed.notes).toBe("Need additional seats");
  });

  it("rejects invalid add-on type", () => {
    const result = requestAddOnSchema.safeParse({
      type: "INVALID_TYPE",
    });

    expect(result.success).toBe(false);
  });

  it("validates usage resource params schema", () => {
    const parsed = usageResourceParamsSchema.parse({ resource: "products" });
    expect(parsed.resource).toBe("products");
  });
});
