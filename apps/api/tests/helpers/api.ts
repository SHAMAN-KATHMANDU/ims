/**
 * Supertest + JWT helpers for API integration tests.
 * Use when running integration tests against the Express app.
 */

import request, { SuperTest, Test } from "supertest";
import type { Application } from "express";

/**
 * Create a Supertest agent for the Express app.
 * Use .get(), .post(), etc. to make requests.
 */
export function apiRequest(app: Application): SuperTest<Test> {
  return request(app) as unknown as SuperTest<Test>;
}

/**
 * Add Bearer token to request. Chain after get/post/etc.
 * Example: apiRequest(app).get("/api/v1/products").auth(token, { type: "bearer" }).expect(200)
 */
export function withAuth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
