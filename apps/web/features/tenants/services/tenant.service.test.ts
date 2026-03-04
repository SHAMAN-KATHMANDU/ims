import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTenants,
  getTenantById,
  createTenant,
  getPlatformStats,
} from "./tenant.service";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant.service", () => {
  describe("getTenants", () => {
    it("calls GET /platform/tenants", async () => {
      mockGet.mockResolvedValue({ data: { tenants: [] } });

      await getTenants();

      expect(mockGet).toHaveBeenCalledWith("/platform/tenants");
    });
  });

  describe("getTenantById", () => {
    it("calls GET /platform/tenants/:id", async () => {
      mockGet.mockResolvedValue({
        data: { tenant: { id: "t1", name: "Acme", slug: "acme" } },
      });

      await getTenantById("t1");

      expect(mockGet).toHaveBeenCalledWith("/platform/tenants/t1");
    });
  });

  describe("createTenant", () => {
    it("calls POST /platform/tenants with payload", async () => {
      mockPost.mockResolvedValue({
        data: {
          tenant: { id: "t1", name: "Acme", slug: "acme" },
          adminUser: { id: "u1", username: "admin", role: "admin" },
        },
      });

      await createTenant({
        name: "Acme",
        slug: "acme",
        adminUsername: "admin",
        adminPassword: "secret123",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/platform/tenants",
        expect.objectContaining({
          name: "Acme",
          slug: "acme",
          adminUsername: "admin",
          adminPassword: "secret123",
        }),
      );
    });
  });

  describe("getPlatformStats", () => {
    it("calls GET /platform/stats", async () => {
      mockGet.mockResolvedValue({
        data: {
          totalTenants: 5,
          activeTenants: 4,
          trialTenants: 1,
          totalUsers: 10,
          totalSales: 100,
          planDistribution: [],
        },
      });

      await getPlatformStats();

      expect(mockGet).toHaveBeenCalledWith("/platform/stats");
    });
  });
});
