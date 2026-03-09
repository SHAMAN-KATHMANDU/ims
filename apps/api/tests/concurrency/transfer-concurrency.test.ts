/**
 * Phase 6 — Concurrency tests: transfer creation.
 * Parallel transfer requests complete without error.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransferRepository } from "@/modules/transfers/transfer.repository";

let callCount = 0;
const mockCreate = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    transfer: {
      create: (args: unknown) => mockCreate(args),
    },
  },
}));

describe("Transfer concurrency", () => {
  let repo: TransferRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    callCount = 0;
    mockCreate.mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        id: `transfer-${callCount}`,
        transferCode: `TRF-${callCount}`,
        status: "PENDING",
      });
    });
    repo = new TransferRepository();
  });

  it("handles 5 parallel transfer creation calls", async () => {
    const createData = {
      tenantId: "t1",
      fromLocationId: "550e8400-e29b-41d4-a716-446655440001",
      toLocationId: "550e8400-e29b-41d4-a716-446655440002",
      createdById: "u1",
      notes: null,
      items: [
        {
          variationId: "550e8400-e29b-41d4-a716-446655440003",
          subVariationId: null,
          quantity: 5,
        },
      ],
    };

    const createPromises = Array.from({ length: 5 }, (_, i) =>
      repo.createTransfer({
        ...createData,
        notes: `Transfer ${i + 1}`,
      }),
    );

    const results = await Promise.all(createPromises);

    expect(results).toHaveLength(5);
    expect(results.every((r) => r != null)).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(5);
  });
});
