import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformService } from "./platform.service";
import type { PlatformRepository } from "./platform.repository";

const mockFindBySlug = vi.fn();
const mockCreateTenantWithAdmin = vi.fn();
const mockFindTenantById = vi.fn();

const mockRepo = {
  findBySlug: mockFindBySlug,
  createTenantWithAdmin: mockCreateTenantWithAdmin,
  findTenantById: mockFindTenantById,
} as unknown as PlatformRepository;

const mockBcryptHash = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { hash: (...args: unknown[]) => mockBcryptHash(...args) },
}));

const platformService = new PlatformService(mockRepo);

describe("PlatformService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue("hashed-password");
  });

  describe("createTenant", () => {
    it("creates tenant when slug is available", async () => {
      mockFindBySlug.mockResolvedValue(null);
      mockCreateTenantWithAdmin.mockResolvedValue({
        tenant: {
          id: "t1",
          name: "Acme",
          slug: "acme",
          plan: "STARTER",
        },
        admin: { id: "u1", username: "admin" },
      });

      const result = await platformService.createTenant({
        name: "Acme",
        slug: "acme",
        plan: "STARTER",
        adminUsername: "admin",
        adminPassword: "secret123",
      });

      expect(result.tenant.slug).toBe("acme");
      expect(mockBcryptHash).toHaveBeenCalledWith("secret123", 10);
      expect(mockCreateTenantWithAdmin).toHaveBeenCalled();
    });

    it("throws 409 when slug already exists", async () => {
      mockFindBySlug.mockResolvedValue({ id: "t0", slug: "acme" });

      await expect(
        platformService.createTenant({
          name: "Acme",
          slug: "acme",
          plan: "STARTER",
          adminUsername: "admin",
          adminPassword: "secret",
        }),
      ).rejects.toMatchObject(
        expect.objectContaining({
          statusCode: 409,
          message: expect.stringContaining("already exists"),
        }),
      );

      expect(mockCreateTenantWithAdmin).not.toHaveBeenCalled();
    });
  });
});
