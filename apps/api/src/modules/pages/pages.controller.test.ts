import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./pages.service", () => ({
  default: {
    listPages: vi.fn(),
    getPage: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    publishPage: vi.fn(),
    unpublishPage: vi.fn(),
    deletePage: vi.fn(),
    reorder: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({ id: "u1", tenantId: "t1", role: "admin" })),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./pages.controller";
import * as serviceModule from "./pages.service";

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

describe("PagesController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listPages returns 200", async () => {
    mockService.listPages.mockResolvedValue({
      pages: [],
      total: 0,
      page: 1,
      limit: 50,
    });
    const res = mockRes() as Response;
    await controller.listPages(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("createPage returns 201", async () => {
    mockService.createPage.mockResolvedValue({ id: "p1" });
    const res = mockRes() as Response;
    await controller.createPage(
      makeReq({
        body: { slug: "about", title: "About", bodyMarkdown: "body" },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("createPage 400s on invalid slug", async () => {
    const res = mockRes() as Response;
    await controller.createPage(
      makeReq({
        body: { slug: "products", title: "Bad", bodyMarkdown: "body" },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("publishPage calls service", async () => {
    mockService.publishPage.mockResolvedValue({ id: "p1" });
    const res = mockRes() as Response;
    await controller.publishPage(makeReq({ params: { id: "p1" } }), res);
    expect(mockService.publishPage).toHaveBeenCalledWith("t1", "p1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("deletePage returns 200", async () => {
    mockService.deletePage.mockResolvedValue(undefined);
    const res = mockRes() as Response;
    await controller.deletePage(makeReq({ params: { id: "p1" } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("reorderPages 200 on valid payload", async () => {
    mockService.reorder.mockResolvedValue(undefined);
    const res = mockRes() as Response;
    await controller.reorderPages(
      makeReq({
        body: {
          order: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              navOrder: 0,
            },
          ],
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
