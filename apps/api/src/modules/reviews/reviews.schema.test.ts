import { describe, it, expect } from "vitest";
import {
  ListReviewsQuerySchema,
  UpdateReviewSchema,
  ReviewStatusSchema,
} from "./reviews.schema";

describe("ReviewStatusSchema", () => {
  it("accepts the three valid statuses", () => {
    expect(ReviewStatusSchema.parse("PENDING")).toBe("PENDING");
    expect(ReviewStatusSchema.parse("APPROVED")).toBe("APPROVED");
    expect(ReviewStatusSchema.parse("REJECTED")).toBe("REJECTED");
  });

  it("rejects other values", () => {
    expect(() => ReviewStatusSchema.parse("pending")).toThrow();
    expect(() => ReviewStatusSchema.parse("SPAM")).toThrow();
  });
});

describe("ListReviewsQuerySchema", () => {
  it("defaults page=1 and limit=25 when omitted", () => {
    const parsed = ListReviewsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(25);
    expect(parsed.productId).toBeUndefined();
    expect(parsed.status).toBeUndefined();
  });

  it("coerces numeric query strings", () => {
    const parsed = ListReviewsQuerySchema.parse({ page: "3", limit: "50" });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);
  });

  it("accepts productId uuid and status filter", () => {
    const parsed = ListReviewsQuerySchema.parse({
      productId: "11111111-1111-1111-1111-111111111111",
      status: "APPROVED",
    });
    expect(parsed.productId).toBe("11111111-1111-1111-1111-111111111111");
    expect(parsed.status).toBe("APPROVED");
  });

  it("rejects non-uuid productId", () => {
    expect(() =>
      ListReviewsQuerySchema.parse({ productId: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects limit above 100", () => {
    expect(() => ListReviewsQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects page < 1", () => {
    expect(() => ListReviewsQuerySchema.parse({ page: 0 })).toThrow();
  });
});

describe("UpdateReviewSchema", () => {
  it("accepts a status field", () => {
    expect(UpdateReviewSchema.parse({ status: "APPROVED" })).toEqual({
      status: "APPROVED",
    });
  });

  it("rejects an empty object (no fields)", () => {
    expect(() => UpdateReviewSchema.parse({})).toThrow();
  });

  it("rejects invalid status value", () => {
    expect(() => UpdateReviewSchema.parse({ status: "deleted" })).toThrow();
  });
});
