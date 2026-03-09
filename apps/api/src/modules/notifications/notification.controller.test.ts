import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./notification.service", () => ({
  default: {
    getAll: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    deleteAll: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import notificationController from "./notification.controller";
import * as notificationServiceModule from "./notification.service";

const mockService = notificationServiceModule.default as unknown as Record<
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

describe("NotificationController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns 200 with notifications on success", async () => {
      const notifications = [{ id: "1", title: "Test" }];
      mockService.getAll.mockResolvedValue(notifications);
      const req = makeReq();
      const res = mockRes() as Response;

      await notificationController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ notifications }),
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns 200 with count on success", async () => {
      mockService.getUnreadCount.mockResolvedValue(5);
      const req = makeReq();
      const res = mockRes() as Response;

      await notificationController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 }),
      );
    });
  });
});
