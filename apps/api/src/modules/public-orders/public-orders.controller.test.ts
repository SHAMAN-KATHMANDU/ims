import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("@/modules/website-orders/website-orders.service", () => ({
  default: {
    createGuestOrder: vi.fn(),
  },
}));
vi.mock("@/modules/website-orders/website-orders.notify", () => ({
  notifyNewOrder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {}, basePrisma: {} }));

import controller from "./public-orders.controller";
import * as serviceModule from "@/modules/website-orders/website-orders.service";
import * as notifyModule from "@/modules/website-orders/website-orders.notify";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;
const mockNotify = notifyModule.notifyNewOrder as ReturnType<typeof vi.fn>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    tenant: { id: "t1", name: "Acme", slug: "acme", isActive: true },
    params: {},
    body: {},
    headers: { "user-agent": "TestAgent" },
    ...overrides,
  } as unknown as Request;
}

const validPayload = {
  customerName: "Ada",
  customerPhone: "+977 98xxxxxxx",
  items: [
    {
      productId: "11111111-1111-1111-1111-111111111111",
      productName: "Lamp",
      unitPrice: 1000,
      quantity: 1,
      lineTotal: 1000,
    },
  ],
};

describe("PublicOrdersController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when host is not resolved", async () => {
    const res = mockRes() as Response;
    await controller.createOrder(
      makeReq({ tenant: undefined } as unknown as Partial<Request>),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 on invalid body", async () => {
    const res = mockRes() as Response;
    await controller.createOrder(makeReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 201 with orderCode on success and fires the notify fan-out", async () => {
    const createdOrder = { id: "o1", orderCode: "WO-2026-0001" };
    mockService.createGuestOrder.mockResolvedValue(createdOrder);
    const res = mockRes() as Response;
    await controller.createOrder(makeReq({ body: validPayload }), res);
    expect(mockService.createGuestOrder).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        customerName: "Ada",
        customerPhone: "+977 98xxxxxxx",
        sourceUserAgent: "TestAgent",
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith("t1", createdOrder);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orderCode: "WO-2026-0001" }),
    );
  });

  it("does not fire notify when the service throws", async () => {
    mockService.createGuestOrder.mockRejectedValue(
      Object.assign(new Error("cart empty"), { statusCode: 400 }),
    );
    const res = mockRes() as Response;
    await controller.createOrder(makeReq({ body: validPayload }), res);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("uses X-Forwarded-For when set", async () => {
    mockService.createGuestOrder.mockResolvedValue({
      orderCode: "WO-2026-0002",
    });
    const res = mockRes() as Response;
    await controller.createOrder(
      makeReq({
        body: validPayload,
        headers: {
          "user-agent": "TestAgent",
          "x-forwarded-for": "203.0.113.1, 10.0.0.1",
        },
      }),
      res,
    );
    const call = mockService.createGuestOrder.mock.calls[0][1];
    expect(call.sourceIp).toBe("203.0.113.1");
  });

  it("accepts a second order with the same phone number", async () => {
    const req = makeReq({ body: validPayload });
    const res = mockRes() as Response;
    mockService.createGuestOrder.mockResolvedValue({
      id: "o2",
      orderCode: "WO-2026-0002",
      customerPhone: validPayload.customerPhone,
    });
    await controller.createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("accepts an order with 10 items", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      productId: `${"1".repeat(7)}${i}-1111-1111-1111-111111111111`.slice(
        0,
        36,
      ),
      productName: `Product ${i}`,
      unitPrice: 100,
      quantity: 1,
      lineTotal: 100,
    }));
    const req = makeReq({
      body: { ...validPayload, items },
    });
    const res = mockRes() as Response;
    mockService.createGuestOrder.mockResolvedValue({
      id: "o3",
      orderCode: "WO-2026-0003",
    });
    await controller.createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockService.createGuestOrder).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ productName: "Product 0" }),
        ]),
      }),
    );
  });

  it("returns user-friendly message on P2002 collision", async () => {
    const req = makeReq({ body: validPayload });
    const res = mockRes() as Response;
    const p2002Error = new Error("P2002") as Error & { code: string };
    p2002Error.code = "P2002";
    mockService.createGuestOrder.mockRejectedValue(p2002Error);
    await controller.createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("try again"),
      }),
    );
  });

  it("fires notification after successful order", async () => {
    const req = makeReq({ body: validPayload });
    const res = mockRes() as Response;
    const createdOrder = { id: "o-notify", orderCode: "WO-2026-0010" };
    mockService.createGuestOrder.mockResolvedValue(createdOrder);
    await controller.createOrder(req, res);
    expect(mockNotify).toHaveBeenCalledWith("t1", createdOrder);
  });

  it("maps AppError status code from service", async () => {
    mockService.createGuestOrder.mockRejectedValue(
      Object.assign(new Error("Website disabled"), { statusCode: 403 }),
    );
    const res = mockRes() as Response;
    await controller.createOrder(makeReq({ body: validPayload }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
