import { describe, expect, it } from "vitest";
import { auditLogsQuerySchema } from "./audit.schema";

describe("audit schemas", () => {
  it("validates auditLogsQuerySchema", () => {
    const parsed = auditLogsQuerySchema.parse({
      page: "2",
      limit: "25",
      userId: "user-1",
      action: "CREATE_PRODUCT",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
    expect(parsed.from).toBe("2026-01-01");
  });

  it("rejects invalid date format", () => {
    const result = auditLogsQuerySchema.safeParse({
      from: "01-31-2026",
    });
    expect(result.success).toBe(false);
  });
});
