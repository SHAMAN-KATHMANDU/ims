/**
 * Unit tests for UserRepository — findByUsername, create, softDelete.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findMany: vi.fn(),
      count: vi.fn(),
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
    it("queries with username and excludes soft-deleted users", async () => {
      mockFindFirst.mockResolvedValue({ id: "u1", username: "alice" });

      const result = await userRepository.findByUsername("alice");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { username: "alice", deletedAt: null },
      });
      expect(result?.username).toBe("alice");
    });

    it("returns null when not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await userRepository.findByUsername("missing");

      expect(result).toBeNull();
    });
  });

  describe("softDelete (issue #537)", () => {
    it("sets deletedAt on the user row", async () => {
      mockUpdate.mockResolvedValue({ id: "u1", username: "alice" });

      await userRepository.softDelete("u1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { deletedAt: expect.any(Date) },
        select: expect.any(Object),
      });
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
