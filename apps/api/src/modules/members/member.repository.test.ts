/**
 * Unit tests for MemberRepository — query construction.
 * Mocks Prisma to verify correct calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    member: {
      create: mockCreate,
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import memberRepository from "./member.repository";

describe("MemberRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("calls prisma.member.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "m1",
        phone: "+1234567890",
        name: "Alice",
        tenantId: "t1",
      });

      await memberRepository.create({
        tenantId: "t1",
        phone: "+1234567890",
        name: "Alice",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "t1",
          phone: "+1234567890",
          name: "Alice",
        }),
      });
    });
  });
});
