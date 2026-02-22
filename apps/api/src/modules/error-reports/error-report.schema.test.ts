import { describe, it, expect } from "vitest";
import {
  createErrorReportSchema,
  errorReportIdParamsSchema,
  errorReportsListQuerySchema,
  updateErrorReportStatusSchema,
} from "./error-report.schema";

describe("error report schemas", () => {
  it("validates createErrorReportSchema and trims fields", () => {
    const parsed = createErrorReportSchema.parse({
      title: "  Button click crashes page ",
      description: "  Happens on dashboard only ",
      pageUrl: "  /dashboard ",
    });

    expect(parsed.title).toBe("Button click crashes page");
    expect(parsed.description).toBe("Happens on dashboard only");
    expect(parsed.pageUrl).toBe("/dashboard");
  });

  it("rejects empty title", () => {
    const result = createErrorReportSchema.safeParse({
      title: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateErrorReportStatusSchema", () => {
    const parsed = updateErrorReportStatusSchema.parse({
      status: "REVIEWED",
    });

    expect(parsed.status).toBe("REVIEWED");
  });

  it("validates errorReportIdParamsSchema", () => {
    const parsed = errorReportIdParamsSchema.parse({ id: "er-1" });
    expect(parsed.id).toBe("er-1");
  });

  it("validates errorReportsListQuerySchema", () => {
    const parsed = errorReportsListQuerySchema.parse({
      status: "OPEN",
      page: "3",
      limit: "15",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(parsed.status).toBe("OPEN");
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(15);
    expect(parsed.from).toBe("2026-01-01");
    expect(parsed.to).toBe("2026-01-31");
  });
});
