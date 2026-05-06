import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./blog.service", () => ({
  default: {
    listPosts: vi.fn(),
    getPost: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    publishPost: vi.fn(),
    unpublishPost: vi.fn(),
    deletePost: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
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

import controller from "./blog.controller";
import * as serviceModule from "./blog.service";

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

describe("BlogController", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listPosts", () => {
    it("returns 200 with paginated posts", async () => {
      mockService.listPosts.mockResolvedValue({
        posts: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      const res = mockRes() as Response;
      await controller.listPosts(
        makeReq({ query: { page: "2" } as unknown as Request["query"] }),
        res,
      );
      expect(mockService.listPosts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ page: 2, limit: 20 }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 on invalid query", async () => {
      const res = mockRes() as Response;
      await controller.listPosts(
        makeReq({ query: { status: "BOGUS" } as unknown as Request["query"] }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("createPost", () => {
    it("returns 201 with the new post", async () => {
      mockService.createPost.mockResolvedValue({ id: "p1" });
      const res = mockRes() as Response;
      await controller.createPost(
        makeReq({
          body: {
            slug: "hello",
            title: "Hello",
            bodyMarkdown: "Body",
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ post: { id: "p1" } }),
      );
    });

    it("maps AppError status code", async () => {
      mockService.createPost.mockRejectedValue(
        Object.assign(new Error("dup"), { statusCode: 409 }),
      );
      const res = mockRes() as Response;
      await controller.createPost(
        makeReq({
          body: {
            slug: "dup",
            title: "Dup",
            bodyMarkdown: "Body",
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 on validation error", async () => {
      const res = mockRes() as Response;
      await controller.createPost(
        makeReq({
          body: { slug: "BAD SLUG", title: "x", bodyMarkdown: "body" },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("publishPost", () => {
    it("calls service and returns 200", async () => {
      mockService.publishPost.mockResolvedValue({ id: "p1" });
      const res = mockRes() as Response;
      await controller.publishPost(makeReq({ params: { id: "p1" } }), res);
      expect(mockService.publishPost).toHaveBeenCalledWith("t1", "p1", "u1");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deletePost", () => {
    it("returns 200 when deleted", async () => {
      mockService.deletePost.mockResolvedValue(undefined);
      const res = mockRes() as Response;
      await controller.deletePost(makeReq({ params: { id: "p1" } }), res);
      expect(mockService.deletePost).toHaveBeenCalledWith("t1", "p1");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("categories", () => {
    it("createCategory returns 201", async () => {
      mockService.createCategory.mockResolvedValue({ id: "c1" });
      const res = mockRes() as Response;
      await controller.createCategory(
        makeReq({ body: { slug: "stories", name: "Stories" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
