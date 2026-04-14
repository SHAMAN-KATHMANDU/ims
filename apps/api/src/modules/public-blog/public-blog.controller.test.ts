import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./public-blog.service", () => ({
  default: {
    listPosts: vi.fn(),
    getPostBySlug: vi.fn(),
    listFeatured: vi.fn(),
    listCategories: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./public-blog.controller";
import * as serviceModule from "./public-blog.service";

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

describe("PublicBlogController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listPosts returns 200 with posts + pagination", async () => {
    mockService.listPosts.mockResolvedValue({
      posts: [],
      total: 0,
      page: 1,
      limit: 12,
    });
    const res = mockRes() as Response;
    await controller.listPosts(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("listPosts returns 400 when host not resolved", async () => {
    const res = mockRes() as Response;
    await controller.listPosts(
      makeReq({ tenant: undefined } as unknown as Partial<Request>),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getPostBySlug returns 200 with post + related", async () => {
    mockService.getPostBySlug.mockResolvedValue({
      post: { id: "p1" },
      related: [],
    });
    const res = mockRes() as Response;
    await controller.getPostBySlug(
      makeReq({ params: { slug: "welcome" } }),
      res,
    );
    expect(mockService.getPostBySlug).toHaveBeenCalledWith("t1", "welcome");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getPostBySlug returns 404 when service throws", async () => {
    mockService.getPostBySlug.mockRejectedValue(
      Object.assign(new Error("not found"), { statusCode: 404 }),
    );
    const res = mockRes() as Response;
    await controller.getPostBySlug(
      makeReq({ params: { slug: "missing" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("listFeatured returns 200 with posts", async () => {
    mockService.listFeatured.mockResolvedValue([]);
    const res = mockRes() as Response;
    await controller.listFeatured(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("listCategories returns 200", async () => {
    mockService.listCategories.mockResolvedValue([]);
    const res = mockRes() as Response;
    await controller.listCategories(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
