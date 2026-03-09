import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./activity.service", () => ({
  default: {
    create: vi.fn(),
    getByContact: vi.fn(),
    getByDeal: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import activityController from "./activity.controller";
import * as activityServiceModule from "./activity.service";

const mockService = activityServiceModule.default as unknown as Record<
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

describe("ActivityController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with activity on success", async () => {
      const activity = { id: "1", type: "CALL" };
      mockService.create.mockResolvedValue(activity);
      const req = makeReq({
        body: {
          type: "CALL",
          contactId: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await activityController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ activity }),
      );
    });
  });
});
