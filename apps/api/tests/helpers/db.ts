/**
 * Database helpers for integration tests.
 *
 * For integration tests that hit a real database:
 * - Use DATABASE_URL_TEST (or DATABASE_URL) for a dedicated test DB
 * - Wrap test logic in a transaction and roll back after each test to isolate state
 *
 * Prisma interactive transactions auto-rollback on callback throw.
 * Pattern: run test logic inside $transaction; throw after assertions to force rollback.
 */

import type { PrismaClient } from "@prisma/client";

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Run a test function inside a Prisma transaction.
 * If the callback completes, the transaction commits.
 * If the callback throws, the transaction rolls back.
 *
 * Use with a test DB. Example:
 *
 *   await withTestTransaction(prisma, async (tx) => {
 *     const product = await tx.product.create({ data: createProduct() });
 *     expect(product.id).toBeDefined();
 *   });
 *
 * Note: Pass the actual Prisma client from your test setup.
 * For unit tests, mock Prisma — this helper is for integration tests only.
 */
export async function withTestTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
