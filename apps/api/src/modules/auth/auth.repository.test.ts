/**
 * Unit tests for AuthRepository — query construction.
 * Mocks basePrisma to verify correct calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindFirst, mockUpdate, mockCreate } = vi.hoisted(
  () => ({
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
    mockUpdate: vi.fn(),
    mockCreate: vi.fn(),
  }),
);

vi.mock("@/config/prisma", () => ({
  default: {},
  basePrisma: {
    tenant: { findUnique: mockFindUnique },
    user: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    auditLog: { create: mockCreate },
  },
}));

import { AuthRepository } from "./auth.repository";

const authRepo = new AuthRepository();

describe("AuthRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findTenantBySlug", () => {
    it("calls basePrisma.tenant.findUnique with slug", async () => {
      mockFindUnique.mockResolvedValue({
        id: "t1",
        slug: "acme",
        name: "Acme",
        isActive: true,
      });

      await authRepo.findTenantBySlug("acme");

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { slug: "acme" } });
    });
  });

  describe("findUserByTenantAndUsername", () => {
    it("calls basePrisma.user.findFirst with tenantId and username", async () => {
      mockFindFirst.mockResolvedValue({
        id: "u1",
        tenantId: "t1",
        username: "admin",
      });

      await authRepo.findUserByTenantAndUsername("t1", "admin");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1", username: "admin" },
      });
    });
  });
});
