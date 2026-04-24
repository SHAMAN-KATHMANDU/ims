/**
 * RBAC seed helpers for E2E tests.
 *
 * These utilities call the live API (no DB direct access) using a fresh
 * APIRequestContext so they work independently of the browser session.
 *
 * Usage:
 *   const token = await getRbacToken(request, slug, username, password);
 *   const role  = await createRoleViaApi(request, token, roleData);
 *   await deleteRoleViaApi(request, token, role.id);
 */

import type { APIRequestContext, Page } from "@playwright/test";

export interface SeedRole {
  id: string;
  name: string;
  priority: number;
  isSystem: boolean;
  permissions: string;
  color: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Login via the API and return the JWT. */
export async function getRbacToken(
  request: APIRequestContext,
  slug: string,
  username: string,
  password: string,
): Promise<string> {
  const resp = await request.post("/api/v1/auth/login", {
    data: { username: username.trim().toLowerCase(), password },
    headers: { "X-Tenant-Slug": slug },
  });
  if (!resp.ok()) {
    throw new Error(
      `getRbacToken: login failed with status ${resp.status()} – ${await resp.text()}`,
    );
  }
  const body = await resp.json();
  const token: string =
    body?.token ?? body?.data?.token ?? body?.data?.user?.token;
  if (!token) throw new Error("getRbacToken: no token in response");
  return token;
}

export interface CreateRolePayload {
  name: string;
  priority: number;
  /** base64-encoded 64-byte zero bitset (no permissions). */
  permissions?: string;
  color?: string | null;
}

const EMPTY_BITSET_B64 = Buffer.from(new Uint8Array(64)).toString("base64");

/** Create a custom role via API and return the created role. */
export async function createRoleViaApi(
  request: APIRequestContext,
  token: string,
  data: CreateRolePayload,
): Promise<SeedRole> {
  const resp = await request.post("/api/v1/permissions/roles", {
    data: {
      name: data.name,
      priority: data.priority,
      permissions: data.permissions ?? EMPTY_BITSET_B64,
      color: data.color ?? null,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok()) {
    throw new Error(
      `createRoleViaApi: failed ${resp.status()} – ${await resp.text()}`,
    );
  }
  const body = await resp.json();
  return body?.data?.role ?? body?.role ?? body;
}

/** Delete a role via API (no-op if already gone). */
export async function deleteRoleViaApi(
  request: APIRequestContext,
  token: string,
  roleId: string,
): Promise<void> {
  const resp = await request.delete(`/api/v1/permissions/roles/${roleId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // 404 is fine — role already cleaned up or never existed.
  if (!resp.ok() && resp.status() !== 404) {
    throw new Error(
      `deleteRoleViaApi: failed ${resp.status()} – ${await resp.text()}`,
    );
  }
}

/**
 * Extract the JWT from the `auth-storage` cookie the browser stored after
 * login. Use this when you need to make API calls from within a test that
 * already has a browser session (so you don't have to re-login).
 */
export async function getAuthTokenFromPage(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((c) => c.name === "auth-storage");
  if (!authCookie) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    // Zustand persist shape: { state: { token: "..." } }
    return parsed?.state?.token ?? parsed?.token ?? null;
  } catch {
    return null;
  }
}
