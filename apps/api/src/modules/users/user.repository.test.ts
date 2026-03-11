/**
 * Unit tests for UserRepository — findByUsername, create.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn(),
  createPaginationResult: vi.fn(),
  getPrismaOrderBy: vi.fn().mockReturnValue({ createdAt: "desc" }),
}));

import userRepository from "./user.repository";

describe("UserRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findByUsername", () => {
    it("queries with username", async () => {
      mockFindFirst.mockResolvedValue({ id: "u1", username: "alice" });

      const result = await userRepository.findByUsername("alice");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { username: "alice" },
      });
      expect(result?.username).toBe("alice");
    });

    it("returns null when not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await userRepository.findByUsername("missing");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("calls prisma.user.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "u1",
        username: "alice",
        role: "admin",
      });

      await userRepository.create("t1", {
        username: "alice",
        hashedPassword: "hash",
        role: "admin",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          username: "alice",
          password: "hash",
          role: "admin",
        },
        select: expect.any(Object),
      });
    });
  });
});
