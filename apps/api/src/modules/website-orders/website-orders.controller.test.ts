import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./website-orders.service", () => ({
  default: {
    listOrders: vi.fn(),
    getOrder: vi.fn(),
    verifyOrder: vi.fn(),
    rejectOrder: vi.fn(),
    convertToSale: vi.fn(),
    deleteOrder: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({
    userId: "u1",
    tenantId: "t1",
    role: "admin",
  })),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./website-orders.controller";
import * as serviceModule from "./website-orders.service";

const mockService = serviceModule.default as unknown as Record<
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

describe("WebsiteOrdersController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listOrders 200", async () => {
    mockService.listOrders.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const res = mockRes() as Response;
    await controller.listOrders(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("verifyOrder calls service", async () => {
    mockService.verifyOrder.mockResolvedValue({ id: "o1" });
    const res = mockRes() as Response;
    await controller.verifyOrder(makeReq({ params: { id: "o1" } }), res);
    expect(mockService.verifyOrder).toHaveBeenCalledWith("t1", "o1", "u1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejectOrder requires a reason", async () => {
    const res = mockRes() as Response;
    await controller.rejectOrder(
      makeReq({ params: { id: "o1" }, body: {} }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejectOrder 200 with reason", async () => {
    mockService.rejectOrder.mockResolvedValue({ id: "o1" });
    const res = mockRes() as Response;
    await controller.rejectOrder(
      makeReq({ params: { id: "o1" }, body: { reason: "spam" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("convertOrder requires locationId", async () => {
    const res = mockRes() as Response;
    await controller.convertOrder(
      makeReq({ params: { id: "o1" }, body: {} }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("convertOrder 200 on valid body", async () => {
    mockService.convertToSale.mockResolvedValue({ id: "o1" });
    const res = mockRes() as Response;
    await controller.convertOrder(
      makeReq({
        params: { id: "o1" },
        body: { locationId: "11111111-1111-1111-1111-111111111111" },
      }),
      res,
    );
    expect(mockService.convertToSale).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("deleteOrder 200", async () => {
    mockService.deleteOrder.mockResolvedValue(undefined);
    const res = mockRes() as Response;
    await controller.deleteOrder(makeReq({ params: { id: "o1" } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
