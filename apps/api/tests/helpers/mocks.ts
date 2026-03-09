/**
 * Centralized mock utilities for API tests.
 * Use createMockPrisma, createMockService to avoid duplicating mock setup.
 */

import { vi } from "vitest";

/**
 * Create a mock Prisma delegate (model) with common methods.
 * Each method returns a resolved promise by default; override in tests.
 */
export function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  };
}

/**
 * Create mock basePrisma with trashable models for trash-cleanup job tests.
 * Aligns with TRASHED_MODELS in trashCleanup.ts.
 */
export function createMockBasePrismaForTrash() {
  const delegate = createMockDelegate();
  return {
    product: delegate,
    category: delegate,
    subCategory: delegate,
    vendor: delegate,
    member: delegate,
    location: delegate,
    promoCode: delegate,
    company: delegate,
    contact: delegate,
    lead: delegate,
    deal: delegate,
    task: delegate,
    activity: delegate,
    pipeline: delegate,
  };
}

/**
 * Create a generic mock service with given method names.
 * All methods are vi.fn() — override in tests with mockResolvedValue/mockRejectedValue.
 */
export function createMockService<T extends Record<string, unknown>>(
  methods: (keyof T)[],
): { [K in keyof T]: ReturnType<typeof vi.fn> } {
  const service = {} as { [K in keyof T]: ReturnType<typeof vi.fn> };
  for (const m of methods) {
    (service as Record<string, unknown>)[m as string] = vi.fn();
  }
  return service;
}
