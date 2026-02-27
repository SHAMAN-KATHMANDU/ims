import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./user.service", () => ({
  UserService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import userController from "./user.controller";
import * as userServiceModule from "./user.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = userServiceModule.default as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "superAdmin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

const sampleUser = {
  id: "u2",
  username: "alice",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("returns 201 with created user on success", async () => {
      mockService.create.mockResolvedValue(sampleUser);
      const req = makeReq({
        body: { username: "alice", password: "pass123", role: "admin" },
      });
      const res = mockRes() as Response;

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: sampleUser }),
      );
    });

    it("returns 400 on Zod validation failure", async () => {
      const req = makeReq({ body: { username: "alice", role: "admin" } });
      const res = mockRes() as Response;

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when username already exists", async () => {
      const err = new Error("User with this username already exists") as any;
      err.statusCode = 409;
      mockService.create.mockRejectedValue(err);
      const req = makeReq({
        body: { username: "alice", password: "pass123", role: "admin" },
      });
      const res = mockRes() as Response;

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User with this username already exists",
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: { username: "alice", password: "pass123", role: "admin" },
      });
      const res = mockRes() as Response;

      await userController.createUser(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllUsers", () => {
    it("returns 200 with paginated users on success", async () => {
      const paginationResult = {
        items: [sampleUser],
        totalItems: 1,
        page: 1,
        limit: 20,
      };
      mockService.findAll.mockResolvedValue(paginationResult);
      const req = makeReq({ query: {} });
      const res = mockRes() as Response;

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Users fetched successfully" }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await userController.getAllUsers(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    it("returns 200 with user on success", async () => {
      mockService.findById.mockResolvedValue(sampleUser);
      const req = makeReq({ params: { id: "u2" } });
      const res = mockRes() as Response;

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: sampleUser }),
      );
    });

    it("returns 404 when user not found", async () => {
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      mockService.findById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "nonexistent" } });
      const res = mockRes() as Response;

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User not found" }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findById.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { id: "u2" } });
      const res = mockRes() as Response;

      await userController.getUserById(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("returns 200 with updated user on success", async () => {
      mockService.update.mockResolvedValue({ ...sampleUser, username: "bob" });
      const req = makeReq({
        params: { id: "u2" },
        body: { username: "bob" },
      });
      const res = mockRes() as Response;

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User updated successfully" }),
      );
    });

    it("returns 400 on Zod validation failure (empty body)", async () => {
      const req = makeReq({ params: { id: "u2" }, body: {} });
      const res = mockRes() as Response;

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      mockService.update.mockRejectedValue(err);
      const req = makeReq({
        params: { id: "nonexistent" },
        body: { role: "admin" },
      });
      const res = mockRes() as Response;

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when username already taken", async () => {
      const err = new Error("Username already taken") as any;
      err.statusCode = 409;
      mockService.update.mockRejectedValue(err);
      const req = makeReq({
        params: { id: "u2" },
        body: { username: "taken" },
      });
      const res = mockRes() as Response;

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.update.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { id: "u2" }, body: { role: "admin" } });
      const res = mockRes() as Response;

      await userController.updateUser(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "u2" } });
      const res = mockRes() as Response;

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User deleted successfully" }),
      );
    });

    it("returns 404 when user not found", async () => {
      const err = new Error("User not found") as any;
      err.statusCode = 404;
      mockService.delete.mockRejectedValue(err);
      const req = makeReq({ params: { id: "nonexistent" } });
      const res = mockRes() as Response;

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when trying to delete own account", async () => {
      const err = new Error("You cannot delete your own account") as any;
      err.statusCode = 400;
      mockService.delete.mockRejectedValue(err);
      const req = makeReq({ params: { id: "u1" } });
      const res = mockRes() as Response;

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You cannot delete your own account",
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.delete.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { id: "u2" } });
      const res = mockRes() as Response;

      await userController.deleteUser(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
