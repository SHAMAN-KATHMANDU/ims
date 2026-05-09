import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./forms.service", () => ({
  default: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listSubmissions: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import controller from "./forms.controller";
import * as serviceModule from "./forms.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
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

describe("FormsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns 200 with forms on success", async () => {
      const forms = [
        {
          id: "f1",
          name: "Contact Form",
          slug: "contact",
          tenantId: "t1",
        },
      ];
      mockService.list.mockResolvedValue(forms);

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { forms } }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.list.mockRejectedValue(new Error("DB error"));

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("returns 201 with created form on success", async () => {
      const form = {
        id: "f1",
        name: "Contact Form",
        slug: "contact",
        tenantId: "t1",
      };
      mockService.create.mockResolvedValue(form);

      const req = makeReq({
        body: {
          name: "Contact Form",
          slug: "contact",
          fields: [],
          submitTo: "email",
        },
      });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { form } }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB error"));

      const req = makeReq({
        body: {
          name: "Contact Form",
          slug: "contact",
          fields: [],
        },
      });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("returns 200 with form on success", async () => {
      const form = {
        id: "f1",
        name: "Contact Form",
        tenantId: "t1",
      };
      mockService.get.mockResolvedValue(form);

      const req = makeReq({ params: { id: "f1" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { form } }),
      );
    });
  });

  describe("update", () => {
    it("returns 200 with updated form on success", async () => {
      const form = {
        id: "f1",
        name: "Updated Form",
        tenantId: "t1",
      };
      mockService.update.mockResolvedValue(form);

      const req = makeReq({
        params: { id: "f1" },
        body: { name: "Updated Form" },
      });
      const res = mockRes() as Response;

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { form } }),
      );
    });
  });

  describe("delete", () => {
    it("returns 200 on success", async () => {
      mockService.delete.mockResolvedValue({});

      const req = makeReq({ params: { id: "f1" } });
      const res = mockRes() as Response;

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe("listSubmissions", () => {
    it("returns 200 with submissions and pagination on success", async () => {
      const result = {
        submissions: [{ id: "s1", formId: "f1" }],
        total: 1,
      };
      mockService.listSubmissions.mockResolvedValue(result);

      const req = makeReq({
        params: { id: "f1" },
        query: { limit: "20", offset: "0" },
      });
      const res = mockRes() as Response;

      await controller.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            submissions: result.submissions,
            pagination: {
              limit: 20,
              offset: 0,
              total: 1,
            },
          }),
        }),
      );
    });

    it("caps limit at 100", async () => {
      mockService.listSubmissions.mockResolvedValue({
        submissions: [],
        total: 0,
      });

      const req = makeReq({
        params: { id: "f1" },
        query: { limit: "500" },
      });
      const res = mockRes() as Response;

      await controller.listSubmissions(req, res);

      expect(mockService.listSubmissions).toHaveBeenCalledWith(
        "t1",
        "f1",
        100,
        0,
      );
    });
  });
});
