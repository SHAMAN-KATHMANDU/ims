/**
 * Redirects Service — business logic for redirect management.
 *
 * - Validates redirect cycles (max 5 hops)
 * - Manages CRUD operations
 * - Works with the memoized redirect cache for fast lookups
 */

import { createError } from "@/middlewares/errorHandler";
import repository, { type RedirectsRepository } from "./redirects.repository";
import type { CreateRedirectInput, UpdateRedirectInput } from "./redirects.schema";
import type { TenantRedirect } from "@prisma/client";

export class RedirectsService {
  constructor(private repo: RedirectsRepository) {}

  /**
   * Get all redirects for a tenant.
   */
  async getAll(tenantId: string): Promise<TenantRedirect[]> {
    return this.repo.findAll(tenantId);
  }

  /**
   * Get active redirects for a tenant (used by middleware/internal API).
   */
  async getActive(tenantId: string): Promise<TenantRedirect[]> {
    return this.repo.findActive(tenantId);
  }

  /**
   * Get a single redirect by ID.
   */
  async getById(tenantId: string, id: string): Promise<TenantRedirect> {
    const redirect = await this.repo.findById(tenantId, id);
    if (!redirect || redirect.tenantId !== tenantId) {
      throw createError("Redirect not found", 404);
    }
    return redirect;
  }

  /**
   * Create a new redirect.
   *
   * Validates:
   * 1. fromPath and toPath are not identical
   * 2. No redirect loops (toPath cannot redirect back to fromPath within 5 hops)
   */
  async create(
    tenantId: string,
    input: CreateRedirectInput,
  ): Promise<TenantRedirect> {
    // Validate paths are different
    if (input.fromPath === input.toPath) {
      throw createError(
        "From path and to path cannot be identical",
        400,
      );
    }

    // Check for cycles
    await this.validateNoCycle(tenantId, input.fromPath, input.toPath);

    return this.repo.create(tenantId, input);
  }

  /**
   * Update a redirect.
   */
  async update(
    tenantId: string,
    id: string,
    input: UpdateRedirectInput,
  ): Promise<TenantRedirect> {
    const existing = await this.getById(tenantId, id);

    const fromPath = input.fromPath ?? existing.fromPath;
    const toPath = input.toPath ?? existing.toPath;

    // Validate paths are different
    if (fromPath === toPath) {
      throw createError(
        "From path and to path cannot be identical",
        400,
      );
    }

    // Check for cycles only if toPath changed
    if (input.toPath && input.toPath !== existing.toPath) {
      await this.validateNoCycle(tenantId, fromPath, toPath);
    }

    return this.repo.update(tenantId, id, input);
  }

  /**
   * Delete a redirect.
   */
  async delete(tenantId: string, id: string): Promise<TenantRedirect> {
    await this.getById(tenantId, id); // Verify ownership
    return this.repo.delete(tenantId, id);
  }

  /**
   * Validate that setting toPath as a target doesn't create a cycle.
   *
   * Walks the redirect chain up to 5 hops. If we encounter fromPath in the
   * chain, it's a cycle. If we don't find a redirect, it's safe.
   */
  private async validateNoCycle(
    tenantId: string,
    fromPath: string,
    toPath: string,
  ): Promise<void> {
    const maxHops = 5;
    let current = toPath;

    const redirects = await this.repo.findActive(tenantId);
    const redirectMap = new Map(
      redirects.map((r) => [r.fromPath, r.toPath]),
    );

    for (let i = 0; i < maxHops; i++) {
      const next = redirectMap.get(current);
      if (!next) {
        // Chain terminates safely
        return;
      }
      if (next === fromPath) {
        // Cycle detected
        throw createError(
          `Creating this redirect would form a cycle: ${fromPath} → ${toPath} → ... → ${fromPath}`,
          409,
        );
      }
      current = next;
    }

    // Max hops exceeded (likely a chain, but we allow it)
  }
}

export default new RedirectsService(repository);
