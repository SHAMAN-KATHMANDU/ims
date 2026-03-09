import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, getCurrentUser, logout } from "./auth.service";

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
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

describe("auth.service", () => {
  describe("login", () => {
    it("calls POST /auth/login with username and password", async () => {
      const response = {
        data: {
          token: "jwt-token",
          user: { id: "u1", tenantId: "t1", username: "user1", role: "admin" },
          tenant: { id: "t1", slug: "acme", name: "Acme", plan: "STARTER" },
        },
      };
      mockPost.mockResolvedValue(response);

      await login("user1", "pass123");

      expect(mockPost).toHaveBeenCalledWith(
        "/auth/login",
        { username: "user1", password: "pass123" },
        { headers: {} },
      );
    });

    it("sends X-Tenant-Slug when tenantSlug provided", async () => {
      mockPost.mockResolvedValue({
        data: {
          token: "jwt",
          user: { id: "u1", tenantId: "t1", username: "u" },
          tenant: { id: "t1", slug: "acme" },
        },
      });

      await login("user", "pass", "acme");

      expect(mockPost).toHaveBeenCalledWith(
        "/auth/login",
        expect.any(Object),
        { headers: { "X-Tenant-Slug": "acme" } },
      );
    });
  });

  describe("getCurrentUser", () => {
    it("calls GET /auth/me and returns user data", async () => {
      const userData = {
        user: { id: "u1" },
        tenant: { id: "t1", slug: "acme" },
      };
      mockGet.mockResolvedValue({ data: userData });

      const result = await getCurrentUser();

      expect(mockGet).toHaveBeenCalledWith("/auth/me");
      expect(result).toEqual(userData);
    });

    it("returns null on error", async () => {
      mockGet.mockRejectedValue(new Error("Unauthorized"));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("calls POST /auth/logout", async () => {
      mockPost.mockResolvedValue({});

      await logout();

      expect(mockPost).toHaveBeenCalledWith("/auth/logout");
    });
  });
});
