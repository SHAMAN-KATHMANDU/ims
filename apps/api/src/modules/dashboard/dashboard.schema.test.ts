import { describe, it, expect } from "vitest";
import {
  DashboardUserSummaryQuerySchema,
  DashboardAdminSummaryQuerySchema,
} from "./dashboard.schema";

describe("Dashboard schemas", () => {
  it("accepts empty query for user summary", () => {
    expect(DashboardUserSummaryQuerySchema.parse({})).toEqual({});
  });

  it("accepts empty query for admin summary", () => {
    expect(DashboardAdminSummaryQuerySchema.parse({})).toEqual({});
  });
});
