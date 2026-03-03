import { describe, it, expect } from "vitest";
import { AuditLogQuerySchema } from "./audit.schema";

describe("AuditLogQuerySchema", () => {
  it("accepts valid query with defaults", () => {
    const result = AuditLogQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("accepts page and limit", () => {
    const result = AuditLogQuerySchema.parse({ page: 2, limit: 25 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });

  it("accepts userId, action, from, to", () => {
    const result = AuditLogQuerySchema.parse({
      userId: "u1",
      action: "CREATE",
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(result.userId).toBe("u1");
    expect(result.action).toBe("CREATE");
    expect(result.from).toBe("2024-01-01");
    expect(result.to).toBe("2024-12-31");
  });

  it("rejects invalid date format for from", () => {
    expect(() => AuditLogQuerySchema.parse({ from: "01-01-2024" })).toThrow();
  });
});
