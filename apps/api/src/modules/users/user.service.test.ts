import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "./user.service";
import type { UserRepository } from "./user.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindByUsername = vi.fn();
const mockFindByUsernameExcluding = vi.fn();
const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdRaw = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockRepo: UserRepository = {
  findByUsername: mockFindByUsername,
  findByUsernameExcluding: mockFindByUsernameExcluding,
  create: mockCreate,
  findAll: mockFindAll,
  findById: mockFindById,
  findByIdRaw: mockFindByIdRaw,
  update: mockUpdate,
  delete: mockDelete,
};

const mockBcryptHash = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { hash: (...args: unknown[]) => mockBcryptHash(...args) },
}));

const userService = new UserService(mockRepo);

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates user with hashed password when username is available", async () => {
      mockFindByUsername.mockResolvedValue(null);
      mockBcryptHash.mockResolvedValue("hashed");
      mockCreate.mockResolvedValue({
        id: "u1",
        username: "alice",
        role: "admin",
      });

      const result = await userService.create("t1", {
        username: "alice",
        password: "secret123",
        role: "admin",
      });

      expect(result.username).toBe("alice");
      expect(mockFindByUsername).toHaveBeenCalledWith("alice");
      expect(mockBcryptHash).toHaveBeenCalledWith("secret123", 10);
      expect(mockCreate).toHaveBeenCalledWith("t1", {
        username: "alice",
        password: "secret123",
        role: "admin",
        hashedPassword: "hashed",
      });
    });

    it("throws 409 when username already exists", async () => {
      mockFindByUsername.mockResolvedValue({ id: "u0", username: "alice" });

      await expect(
        userService.create("t1", {
          username: "alice",
          password: "pass",
          role: "user",
        }),
      ).rejects.toMatchObject(
        createError("User with this username already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns user when found", async () => {
      const user = { id: "u1", username: "alice", role: "admin" };
      mockFindById.mockResolvedValue(user);

      const result = await userService.findById("u1");
      expect(result).toEqual(user);
      expect(mockFindById).toHaveBeenCalledWith("u1");
    });

    it("throws 404 when user not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(userService.findById("nobody")).rejects.toMatchObject(
        createError("User not found", 404),
      );
    });
  });

  describe("update", () => {
    it("updates user when username is available", async () => {
      mockFindByIdRaw.mockResolvedValue({
        id: "u1",
        username: "alice",
        role: "admin",
      });
      mockFindByUsernameExcluding.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({ id: "u1", username: "bob" });

      const result = await userService.update("u1", "admin-id", {
        username: "bob",
      });

      expect(result.username).toBe("bob");
      expect(mockFindByUsernameExcluding).toHaveBeenCalledWith("bob", "u1");
      expect(mockUpdate).toHaveBeenCalledWith("u1", { username: "bob" });
    });

    it("throws 404 when user not found", async () => {
      mockFindByIdRaw.mockResolvedValue(null);

      await expect(
        userService.update("nobody", "admin-id", { username: "bob" }),
      ).rejects.toMatchObject(createError("User not found", 404));

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("throws 409 when username already taken", async () => {
      mockFindByIdRaw.mockResolvedValue({ id: "u1", username: "alice" });
      mockFindByUsernameExcluding.mockResolvedValue({
        id: "u2",
        username: "bob",
      });

      await expect(
        userService.update("u1", "admin-id", { username: "bob" }),
      ).rejects.toMatchObject(createError("Username already taken", 409));

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("hashes password when password is updated", async () => {
      mockFindByIdRaw.mockResolvedValue({ id: "u1", username: "alice" });
      mockBcryptHash.mockResolvedValue("new-hashed");
      mockUpdate.mockResolvedValue({ id: "u1" });

      await userService.update("u1", "admin-id", {
        password: "new-password",
      });

      expect(mockBcryptHash).toHaveBeenCalledWith("new-password", 10);
      expect(mockUpdate).toHaveBeenCalledWith("u1", {
        password: "new-hashed",
      });
    });
  });

  describe("delete", () => {
    it("deletes user when not self and not platformAdmin", async () => {
      mockFindByIdRaw.mockResolvedValue({
        id: "u1",
        role: "admin",
      });
      mockDelete.mockResolvedValue(undefined);

      await userService.delete("u1", "admin-id");

      expect(mockDelete).toHaveBeenCalledWith("u1");
    });

    it("throws 400 when deleting own account", async () => {
      mockFindByIdRaw.mockResolvedValue({ id: "u1", role: "admin" });

      await expect(userService.delete("u1", "u1")).rejects.toMatchObject(
        createError("You cannot delete your own account", 400),
      );

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("throws 403 when deleting platform admin", async () => {
      mockFindByIdRaw.mockResolvedValue({
        id: "platform-id",
        role: "platformAdmin",
      });

      await expect(
        userService.delete("platform-id", "admin-id"),
      ).rejects.toMatchObject(
        createError("Cannot delete the platform admin.", 403),
      );

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("throws 404 when user not found", async () => {
      mockFindByIdRaw.mockResolvedValue(null);

      await expect(
        userService.delete("nobody", "admin-id"),
      ).rejects.toMatchObject(createError("User not found", 404));

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
