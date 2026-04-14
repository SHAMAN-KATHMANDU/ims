import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./public-pages.service", () => ({
  default: {
    listPages: vi.fn(),
    getPageBySlug: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./public-pages.controller";
import * as serviceModule from "./public-pages.service";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    tenant: { id: "t1", name: "Acme", slug: "acme", isActive: true },
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("PublicPagesController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listPages 200", async () => {
    mockService.listPages.mockResolvedValue([]);
    const res = mockRes() as Response;
    await controller.listPages(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("listPages 400 when host not resolved", async () => {
    const res = mockRes() as Response;
    await controller.listPages(
      makeReq({ tenant: undefined } as unknown as Partial<Request>),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getPageBySlug 200 when found", async () => {
    mockService.getPageBySlug.mockResolvedValue({ id: "p1" });
    const res = mockRes() as Response;
    await controller.getPageBySlug(makeReq({ params: { slug: "about" } }), res);
    expect(mockService.getPageBySlug).toHaveBeenCalledWith("t1", "about");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getPageBySlug 404 when service throws", async () => {
    mockService.getPageBySlug.mockRejectedValue(
      Object.assign(new Error("not found"), { statusCode: 404 }),
    );
    const res = mockRes() as Response;
    await controller.getPageBySlug(
      makeReq({ params: { slug: "missing" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
