/**
 * Redirects Service — business logic for tenant URL redirect rules.
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo from "./redirects.repository";
import type { TenantRedirect } from "./redirects.repository";
import type { CreateRedirectDto, UpdateRedirectDto } from "./redirects.schema";

type Repo = typeof defaultRepo;

/** Maximum hops to follow when checking for redirect chains. */
const MAX_CHAIN_HOPS = 5;

/**
 * Detect whether adding `fromPath → toPath` to the existing map would
 * create a cycle. Returns the loop path string if a cycle is found,
 * otherwise null.
 */
export function detectCycle(
  map: Map<string, string>,
  fromPath: string,
  toPath: string,
): string | null {
  const testMap = new Map(map);
  testMap.set(fromPath, toPath);

  let current = toPath;
  const visited = new Set<string>([fromPath, toPath]);
  for (let i = 0; i < MAX_CHAIN_HOPS; i++) {
    const next = testMap.get(current);
    if (!next) return null;
    if (visited.has(next)) {
      return `Redirect cycle detected: ${fromPath} → … → ${next}`;
    }
    visited.add(next);
    current = next;
  }
  return `Redirect chain too deep (>${MAX_CHAIN_HOPS} hops)`;
}

export class RedirectsService {
  constructor(private repo: Repo = defaultRepo) {}

  async listAll(tenantId: string): Promise<TenantRedirect[]> {
    return this.repo.findAll(tenantId);
  }

  async listActive(tenantId: string): Promise<TenantRedirect[]> {
    return this.repo.findActive(tenantId);
  }

  async getById(id: string, tenantId: string): Promise<TenantRedirect> {
    const redirect = await this.repo.findById(id, tenantId);
    if (!redirect) throw createError("Redirect not found", 404);
    return redirect;
  }

  async create(
    tenantId: string,
    data: CreateRedirectDto,
  ): Promise<TenantRedirect> {
    const existing = await this.repo.findByFromPath(tenantId, data.fromPath);
    if (existing) {
      throw createError(
        `A redirect from "${data.fromPath}" already exists`,
        409,
      );
    }

    const pathMap = await this.repo.findAllPaths(tenantId);
    const cycle = detectCycle(pathMap, data.fromPath, data.toPath);
    if (cycle) throw createError(cycle, 409);

    return this.repo.create(tenantId, data);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRedirectDto,
  ): Promise<TenantRedirect> {
    const current = await this.getById(id, tenantId);

    const newFrom = data.fromPath ?? current.fromPath;
    const newTo = data.toPath ?? current.toPath;

    if (data.fromPath && data.fromPath !== current.fromPath) {
      const clash = await this.repo.findByFromPath(tenantId, data.fromPath);
      if (clash && clash.id !== id) {
        throw createError(
          `A redirect from "${data.fromPath}" already exists`,
          409,
        );
      }
    }

    const pathMap = await this.repo.findAllPaths(tenantId);
    pathMap.delete(current.fromPath);
    const cycle = detectCycle(pathMap, newFrom, newTo);
    if (cycle) throw createError(cycle, 409);

    return this.repo.update(id, tenantId, data);
  }

  async delete(id: string, tenantId: string): Promise<TenantRedirect> {
    await this.getById(id, tenantId);
    return this.repo.delete(id, tenantId);
  }
}

export default new RedirectsService();
