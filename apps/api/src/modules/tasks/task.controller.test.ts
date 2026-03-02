import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./task.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import taskController from "./task.controller";
import * as taskServiceModule from "./task.service";

const mockService = taskServiceModule.default as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("TaskController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with task on success", async () => {
      const task = { id: "1", title: "Follow up" };
      mockService.create.mockResolvedValue(task);
      const req = makeReq({ body: { title: "Follow up" } });
      const res = mockRes() as Response;

      await taskController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ task }));
    });
  });

  describe("getById", () => {
    it("returns 404 when task not found", async () => {
      const err = new Error("Task not found") as Error & { statusCode: number };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await taskController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
