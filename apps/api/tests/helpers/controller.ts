/**
 * Shared test helpers for API controller tests.
 * Use makeReq and mockRes to avoid duplicating setup across controller tests.
 */

import { Request, Response } from "express";
import { vi } from "vitest";

/**
 * Create a mock Response with status and json returning this for chaining.
 */
export function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

/**
 * Create a mock Request with default user, params, body, query.
 * Override with partial object for test-specific values.
 * Includes get() for user-agent and other headers.
 */
export function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: {
      id: "u1",
      tenantId: "t1",
      role: "admin",
      tenantSlug: "acme",
    },
    params: {},
    body: {},
    query: {},
    get: vi.fn().mockReturnValue(undefined),
    ip: undefined,
    ...overrides,
  } as unknown as Request;
}
