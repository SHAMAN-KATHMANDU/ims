import { describe, it, expect } from "vitest";
import type { Request, Response } from "express";
import {
  publicOrderRateLimit,
  publicCartPingRateLimit,
  orderRateLimitHandler,
  cartPingRateLimitHandler,
  STOREFRONT_RATE_LIMITS,
} from "./publicStorefrontRateLimit";

function makeRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("publicStorefrontRateLimit", () => {
  it("exports middleware functions for both endpoints", () => {
    expect(typeof publicOrderRateLimit).toBe("function");
    expect(typeof publicCartPingRateLimit).toBe("function");
  });

  it("order limit is tight; cart-ping limit is generous (browsing-friendly)", () => {
    expect(STOREFRONT_RATE_LIMITS.orders.max).toBeLessThanOrEqual(30);
    expect(STOREFRONT_RATE_LIMITS.cartPings.max).toBeGreaterThanOrEqual(100);
    // 15-minute windows, matching publicReviewRateLimit.
    expect(STOREFRONT_RATE_LIMITS.orders.windowMs).toBe(15 * 60 * 1000);
    expect(STOREFRONT_RATE_LIMITS.cartPings.windowMs).toBe(15 * 60 * 1000);
  });

  it("order limiter handler responds 429 with a user-facing message", () => {
    const res = makeRes();
    orderRateLimitHandler({} as Request, res);
    expect(res.statusCode).toBe(429);
    expect(JSON.stringify(res.body)).toMatch(/Too many orders/);
  });

  it("cart-ping limiter handler responds 429 with a generic message", () => {
    const res = makeRes();
    cartPingRateLimitHandler({} as Request, res);
    expect(res.statusCode).toBe(429);
    expect(JSON.stringify(res.body)).toMatch(/Too many requests/);
  });
});
