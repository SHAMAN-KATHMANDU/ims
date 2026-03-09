import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@repo/shared";
import {
  getAllUsers,
  getUserById,
  createUser,
  changePassword,
} from "./user.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
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

describe("user.service", () => {
  describe("getAllUsers", () => {
    it("calls GET /users with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      await getAllUsers({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/users"));
    });
  });

  describe("getUserById", () => {
    it("calls GET /users/:id", async () => {
      mockGet.mockResolvedValue({
        data: { user: { id: "u1", username: "admin", role: "admin" } },
      });

      await getUserById("u1");

      expect(mockGet).toHaveBeenCalledWith("/users/u1");
    });
  });

  describe("createUser", () => {
    it("calls POST /users with payload", async () => {
      mockPost.mockResolvedValue({
        data: { user: { id: "u1", username: "newuser", role: "user" } },
      });

      await createUser({
        username: "newuser",
        password: "secret123",
        role: UserRole.USER,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/users",
        expect.objectContaining({
          username: "newuser",
          password: "secret123",
          role: UserRole.USER,
        }),
      );
    });
  });

  describe("changePassword", () => {
    it("calls PUT /users/:id with password", async () => {
      mockPut.mockResolvedValue({});

      await changePassword("u1", "newpass123");

      expect(mockPut).toHaveBeenCalledWith("/users/u1", {
        password: "newpass123",
      });
    });
  });
});
