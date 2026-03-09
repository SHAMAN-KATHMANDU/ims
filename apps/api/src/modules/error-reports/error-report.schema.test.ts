import { describe, it, expect } from "vitest";
import {
  CreateErrorReportSchema,
  UpdateErrorReportStatusSchema,
} from "./error-report.schema";

describe("CreateErrorReportSchema", () => {
  it("accepts valid report", () => {
    const result = CreateErrorReportSchema.parse({
      title: "Bug in form",
      description: "Details here",
      pageUrl: "/products",
    });
    expect(result.title).toBe("Bug in form");
    expect(result.description).toBe("Details here");
    expect(result.pageUrl).toBe("/products");
  });

  it("rejects empty title", () => {
    expect(() => CreateErrorReportSchema.parse({ title: "" })).toThrow();
  });
});

describe("UpdateErrorReportStatusSchema", () => {
  it("accepts OPEN, REVIEWED, RESOLVED", () => {
    expect(UpdateErrorReportStatusSchema.parse({ status: "OPEN" }).status).toBe(
      "OPEN",
    );
    expect(
      UpdateErrorReportStatusSchema.parse({ status: "REVIEWED" }).status,
    ).toBe("REVIEWED");
    expect(
      UpdateErrorReportStatusSchema.parse({ status: "RESOLVED" }).status,
    ).toBe("RESOLVED");
  });

  it("rejects invalid status", () => {
    expect(() =>
      UpdateErrorReportStatusSchema.parse({ status: "INVALID" }),
    ).toThrow();
  });
});
