import { describe, it, expect } from "vitest";
import {
  parseAnalyticsFilters,
  buildSalesWhereFromFilters,
  applyRoleToSalesWhere,
  getSalesWhereForAnalytics,
} from "./analytics.filters";

describe("parseAnalyticsFilters", () => {
  describe("string passthrough fields", () => {
    it("returns all supported string fields when provided", () => {
      const result = parseAnalyticsFilters({
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
        userId: "u1",
        categoryId: "c1",
        vendorId: "v1",
      });
      expect(result.dateFrom).toBe("2024-01-01");
      expect(result.dateTo).toBe("2024-12-31");
      expect(result.userId).toBe("u1");
      expect(result.categoryId).toBe("c1");
      expect(result.vendorId).toBe("v1");
    });

    it("drops non-string dateFrom/dateTo/userId/categoryId/vendorId", () => {
      const result = parseAnalyticsFilters({
        dateFrom: 123 as unknown as string,
        dateTo: null as unknown as string,
        userId: {} as unknown as string,
        categoryId: [] as unknown as string,
        vendorId: undefined,
      });
      expect(result.dateFrom).toBeUndefined();
      expect(result.dateTo).toBeUndefined();
      expect(result.userId).toBeUndefined();
      expect(result.categoryId).toBeUndefined();
      expect(result.vendorId).toBeUndefined();
    });
  });

  describe("saleType (enum)", () => {
    it("passes through GENERAL", () => {
      expect(parseAnalyticsFilters({ saleType: "GENERAL" }).saleType).toBe(
        "GENERAL",
      );
    });

    it("passes through MEMBER", () => {
      expect(parseAnalyticsFilters({ saleType: "MEMBER" }).saleType).toBe(
        "MEMBER",
      );
    });

    it("drops unknown saleType values", () => {
      expect(
        parseAnalyticsFilters({ saleType: "OTHER" }).saleType,
      ).toBeUndefined();
      expect(
        parseAnalyticsFilters({ saleType: "general" }).saleType,
      ).toBeUndefined();
      expect(parseAnalyticsFilters({}).saleType).toBeUndefined();
    });
  });

  describe("creditStatus (enum)", () => {
    it("passes through credit / non-credit", () => {
      expect(
        parseAnalyticsFilters({ creditStatus: "credit" }).creditStatus,
      ).toBe("credit");
      expect(
        parseAnalyticsFilters({ creditStatus: "non-credit" }).creditStatus,
      ).toBe("non-credit");
    });

    it("drops unknown creditStatus values", () => {
      expect(
        parseAnalyticsFilters({ creditStatus: "CREDIT" }).creditStatus,
      ).toBeUndefined();
      expect(
        parseAnalyticsFilters({ creditStatus: "paid" }).creditStatus,
      ).toBeUndefined();
    });
  });

  describe("locationIds parsing", () => {
    it("accepts repeated query params as string[]", () => {
      const result = parseAnalyticsFilters({
        locationIds: ["a", "b", "c"],
      });
      expect(result.locationIds).toEqual(["a", "b", "c"]);
    });

    it("deduplicates repeated-key array input", () => {
      const result = parseAnalyticsFilters({
        locationIds: ["a", "b", "a", "c", "b"],
      });
      expect(result.locationIds).toEqual(["a", "b", "c"]);
    });

    it("filters falsy values from array input", () => {
      const result = parseAnalyticsFilters({
        locationIds: ["a", "", "b"],
      });
      expect(result.locationIds).toEqual(["a", "b"]);
    });

    it("splits comma-separated string into trimmed array", () => {
      const result = parseAnalyticsFilters({
        locationIds: "a, b , c",
      });
      expect(result.locationIds).toEqual(["a", "b", "c"]);
    });

    it("deduplicates comma-separated parts", () => {
      const result = parseAnalyticsFilters({
        locationIds: "a,b,a,c,b",
      });
      expect(result.locationIds).toEqual(["a", "b", "c"]);
    });

    it("returns undefined for empty comma string", () => {
      expect(
        parseAnalyticsFilters({ locationIds: "   ,  " }).locationIds,
      ).toBeUndefined();
      expect(
        parseAnalyticsFilters({ locationIds: "" }).locationIds,
      ).toBeUndefined();
    });

    it("returns undefined when omitted", () => {
      expect(parseAnalyticsFilters({}).locationIds).toBeUndefined();
    });
  });
});

describe("buildSalesWhereFromFilters", () => {
  it("always includes deletedAt:null and isLatest:true", () => {
    const where = buildSalesWhereFromFilters({});
    expect(where.deletedAt).toBeNull();
    expect(where.isLatest).toBe(true);
  });

  it("adds locationId: { in: [...] } when locationIds is non-empty", () => {
    const where = buildSalesWhereFromFilters({ locationIds: ["loc1", "loc2"] });
    expect(where.locationId).toEqual({ in: ["loc1", "loc2"] });
  });

  it("omits locationId when locationIds is empty or missing", () => {
    expect(buildSalesWhereFromFilters({}).locationId).toBeUndefined();
    expect(
      buildSalesWhereFromFilters({ locationIds: [] }).locationId,
    ).toBeUndefined();
  });

  it("passes through saleType as where.type", () => {
    expect(buildSalesWhereFromFilters({ saleType: "GENERAL" }).type).toBe(
      "GENERAL",
    );
    expect(buildSalesWhereFromFilters({ saleType: "MEMBER" }).type).toBe(
      "MEMBER",
    );
  });

  it("maps creditStatus=credit to isCreditSale=true", () => {
    expect(
      buildSalesWhereFromFilters({ creditStatus: "credit" }).isCreditSale,
    ).toBe(true);
  });

  it("maps creditStatus=non-credit to isCreditSale=false", () => {
    expect(
      buildSalesWhereFromFilters({ creditStatus: "non-credit" }).isCreditSale,
    ).toBe(false);
  });

  it("omits isCreditSale when creditStatus missing", () => {
    expect(buildSalesWhereFromFilters({}).isCreditSale).toBeUndefined();
  });

  describe("date range", () => {
    it("sets createdAt.gte when dateFrom is provided", () => {
      const where = buildSalesWhereFromFilters({ dateFrom: "2024-01-01" });
      expect(where.createdAt).toBeDefined();
      const ca = where.createdAt as { gte?: Date; lte?: Date };
      expect(ca.gte).toEqual(new Date("2024-01-01"));
      expect(ca.lte).toBeUndefined();
    });

    it("sets createdAt.lte to end-of-day when dateTo is provided", () => {
      const where = buildSalesWhereFromFilters({ dateTo: "2024-06-15" });
      const ca = where.createdAt as { gte?: Date; lte?: Date };
      expect(ca.lte).toBeDefined();
      expect(ca.lte?.getHours()).toBe(23);
      expect(ca.lte?.getMinutes()).toBe(59);
      expect(ca.lte?.getSeconds()).toBe(59);
      expect(ca.lte?.getMilliseconds()).toBe(999);
    });

    it("sets both gte and lte when both bounds are provided", () => {
      const where = buildSalesWhereFromFilters({
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      });
      const ca = where.createdAt as { gte?: Date; lte?: Date };
      expect(ca.gte).toEqual(new Date("2024-01-01"));
      expect(ca.lte).toBeDefined();
    });

    it("omits createdAt entirely when neither bound is provided", () => {
      expect(buildSalesWhereFromFilters({}).createdAt).toBeUndefined();
    });
  });

  it("passes through userId to createdById", () => {
    expect(buildSalesWhereFromFilters({ userId: "u1" }).createdById).toBe("u1");
  });

  describe("category/vendor nested filter", () => {
    it("nests categoryId through items.some.variation.product", () => {
      const where = buildSalesWhereFromFilters({ categoryId: "cat-1" });
      expect(where.items).toEqual({
        some: { variation: { product: { categoryId: "cat-1" } } },
      });
    });

    it("nests vendorId through items.some.variation.product", () => {
      const where = buildSalesWhereFromFilters({ vendorId: "v-1" });
      expect(where.items).toEqual({
        some: { variation: { product: { vendorId: "v-1" } } },
      });
    });

    it("combines categoryId + vendorId in the same nested product filter", () => {
      const where = buildSalesWhereFromFilters({
        categoryId: "cat-1",
        vendorId: "v-1",
      });
      expect(where.items).toEqual({
        some: {
          variation: {
            product: { categoryId: "cat-1", vendorId: "v-1" },
          },
        },
      });
    });

    it("omits the items filter when neither is provided", () => {
      expect(buildSalesWhereFromFilters({}).items).toBeUndefined();
    });
  });
});

describe("applyRoleToSalesWhere", () => {
  it("forces createdById for role=user", () => {
    const result = applyRoleToSalesWhere({}, "user", "user-123");
    expect(result.createdById).toBe("user-123");
  });

  it("overrides filter.userId for role=user", () => {
    // Even if upstream set a different createdById, user role wins
    const result = applyRoleToSalesWhere(
      { createdById: "other-user" },
      "user",
      "user-123",
    );
    expect(result.createdById).toBe("user-123");
  });

  it("does not force createdById for role=admin", () => {
    const result = applyRoleToSalesWhere({}, "admin", "user-123");
    expect(result.createdById).toBeUndefined();
  });

  it("does not force createdById for role=superAdmin", () => {
    const result = applyRoleToSalesWhere({}, "superAdmin", "user-123");
    expect(result.createdById).toBeUndefined();
  });

  it("does not force createdById when role=user but currentUserId is missing", () => {
    const result = applyRoleToSalesWhere({}, "user", undefined);
    expect(result.createdById).toBeUndefined();
  });

  it("preserves existing fields on where for admin role", () => {
    const result = applyRoleToSalesWhere(
      { isCreditSale: true, deletedAt: null },
      "admin",
      "user-123",
    );
    expect(result).toEqual({ isCreditSale: true, deletedAt: null });
  });
});

describe("getSalesWhereForAnalytics (integration)", () => {
  it("returns both filters and where; applies user-role scoping", () => {
    const { filters, where } = getSalesWhereForAnalytics(
      { dateFrom: "2024-01-01", userId: "other-user" },
      "user",
      "me",
    );
    expect(filters.dateFrom).toBe("2024-01-01");
    expect(filters.userId).toBe("other-user");
    // user role overrides createdById to current user regardless of filter.userId
    expect(where.createdById).toBe("me");
  });

  it("honors filter.userId for admin role", () => {
    const { where } = getSalesWhereForAnalytics(
      { userId: "other-user" },
      "admin",
      "me",
    );
    expect(where.createdById).toBe("other-user");
  });
});
