import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service";
import type { AuthRepository } from "./auth.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindTenantBySlug = vi.fn();
const mockFindUserByTenantAndUsername = vi.fn();
const mockUpdateUserLastLogin = vi.fn();
const mockCreateAuditLog = vi.fn();

const mockRepo: AuthRepository = {
  findTenantBySlug: mockFindTenantBySlug,
  findUserByTenantAndUsername: mockFindUserByTenantAndUsername,
  updateUserLastLogin: mockUpdateUserLastLogin,
  createAuditLog: mockCreateAuditLog,
  findUserById: vi.fn(),
  findTenantById: vi.fn(),
  findUserWithPassword: vi.fn(),
  updateUserPassword: vi.fn(),
};

const mockBcryptCompare = vi.fn();
const mockJwtSign = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: vi.fn().mockResolvedValue("hashed"),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (...args: unknown[]) => mockJwtSign(...args),
  },
}));

vi.mock("@/config/env", () => ({
  env: { jwtSecret: "test-secret" },
}));

const authService = new AuthService(mockRepo);

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    const tenant = {
      id: "t1",
      slug: "acme",
      name: "Acme",
      isActive: true,
      plan: "free",
      subscriptionStatus: "active",
      planExpiresAt: null,
      trialEndsAt: null,
    };

    const user = {
      id: "u1",
      tenantId: "t1",
      username: "user",
      role: "admin",
      password: "hashed-pwd",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("returns token and user on successful login", async () => {
      mockFindTenantBySlug.mockResolvedValue(tenant);
      mockFindUserByTenantAndUsername.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true);
      mockUpdateUserLastLogin.mockResolvedValue(undefined);
      mockCreateAuditLog.mockResolvedValue(undefined);
      mockJwtSign.mockReturnValue("jwt-token");

      const result = await authService.login({
        username: "user",
        password: "correct",
        tenantSlug: "acme",
      });

      expect(result.token).toBe("jwt-token");
      expect(result.user.id).toBe("u1");
      expect(result.user.username).toBe("user");
      expect(result.tenant.slug).toBe("acme");
      expect(result.user).not.toHaveProperty("password");

      expect(mockFindTenantBySlug).toHaveBeenCalledWith("acme");
      expect(mockFindUserByTenantAndUsername).toHaveBeenCalledWith(
        "t1",
        "user",
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith("correct", "hashed-pwd");
      expect(mockUpdateUserLastLogin).toHaveBeenCalledWith(
        "u1",
        expect.any(Date),
      );
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN",
          resource: "auth",
          resourceId: "u1",
        }),
      );
    });

    it("throws 404 when tenant not found", async () => {
      mockFindTenantBySlug.mockResolvedValue(null);

      await expect(
        authService.login({
          username: "user",
          password: "pass",
          tenantSlug: "unknown",
        }),
      ).rejects.toMatchObject(createError("Organization not found", 404));

      expect(mockFindUserByTenantAndUsername).not.toHaveBeenCalled();
    });

    it("throws 403 when tenant is inactive", async () => {
      mockFindTenantBySlug.mockResolvedValue({ ...tenant, isActive: false });

      await expect(
        authService.login({
          username: "user",
          password: "pass",
          tenantSlug: "acme",
        }),
      ).rejects.toMatchObject(
        createError("This organization has been deactivated", 403),
      );

      expect(mockFindUserByTenantAndUsername).not.toHaveBeenCalled();
    });

    it("throws 401 when user not found", async () => {
      mockFindTenantBySlug.mockResolvedValue(tenant);
      mockFindUserByTenantAndUsername.mockResolvedValue(null);

      await expect(
        authService.login({
          username: "nobody",
          password: "pass",
          tenantSlug: "acme",
        }),
      ).rejects.toMatchObject(createError("Invalid username or password", 401));

      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it("throws 401 when password is wrong", async () => {
      mockFindTenantBySlug.mockResolvedValue(tenant);
      mockFindUserByTenantAndUsername.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        authService.login({
          username: "user",
          password: "wrong",
          tenantSlug: "acme",
        }),
      ).rejects.toMatchObject(createError("Invalid username or password", 401));

      expect(mockUpdateUserLastLogin).not.toHaveBeenCalled();
      expect(mockJwtSign).not.toHaveBeenCalled();
    });
  });

  describe("getMe", () => {
    it("returns user and tenant when found", async () => {
      const dbUser = {
        id: "u1",
        tenantId: "t1",
        username: "user",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const dbTenant = {
        id: "t1",
        slug: "acme",
        name: "Acme",
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      };

      (mockRepo.findUserById as ReturnType<typeof vi.fn>).mockResolvedValue(
        dbUser,
      );
      (mockRepo.findTenantById as ReturnType<typeof vi.fn>).mockResolvedValue(
        dbTenant,
      );

      const result = await authService.getMe("u1");

      expect(result.user).toEqual(dbUser);
      expect(result.tenant).toEqual(dbTenant);
      expect(mockRepo.findUserById).toHaveBeenCalledWith("u1");
      expect(mockRepo.findTenantById).toHaveBeenCalledWith("t1");
    });

    it("throws 401 when user not found", async () => {
      (mockRepo.findUserById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(authService.getMe("nobody")).rejects.toMatchObject(
        createError("User not found or session invalid", 401),
      );

      expect(mockRepo.findTenantById).not.toHaveBeenCalled();
    });

    it("throws 404 when tenant not found", async () => {
      (mockRepo.findUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "u1",
        tenantId: "t1",
      });
      (mockRepo.findTenantById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      await expect(authService.getMe("u1")).rejects.toMatchObject(
        createError("Tenant not found", 404),
      );
    });
  });

  describe("changePassword", () => {
    it("updates password when current password is correct", async () => {
      const userWithPassword = {
        id: "u1",
        tenantId: "t1",
        username: "user",
        password: "current-hash",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (
        mockRepo.findUserWithPassword as ReturnType<typeof vi.fn>
      ).mockResolvedValue(userWithPassword);
      mockBcryptCompare.mockResolvedValue(true);
      (
        mockRepo.updateUserPassword as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      await authService.changePassword("u1", "current", "new-password");

      expect(mockBcryptCompare).toHaveBeenCalledWith("current", "current-hash");
      expect(mockRepo.updateUserPassword).toHaveBeenCalledWith("u1", "hashed");
    });

    it("throws 404 when user not found", async () => {
      (
        mockRepo.findUserWithPassword as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(
        authService.changePassword("nobody", "current", "new"),
      ).rejects.toMatchObject(createError("User not found", 404));

      expect(mockRepo.updateUserPassword).not.toHaveBeenCalled();
    });

    it("throws 401 when current password is wrong", async () => {
      (
        mockRepo.findUserWithPassword as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: "u1", password: "hash" });
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        authService.changePassword("u1", "wrong", "new"),
      ).rejects.toMatchObject(
        createError("Current password is incorrect", 401),
      );

      expect(mockRepo.updateUserPassword).not.toHaveBeenCalled();
    });
  });
});
