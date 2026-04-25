import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./lead.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    convert: vi.fn(),
    assign: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import leadController from "./lead.controller";
import * as leadServiceModule from "./lead.service";

const mockService = leadServiceModule.default as unknown as Record<
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

describe("LeadController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with lead on success", async () => {
      const lead = { id: "1", name: "John" };
      mockService.create.mockResolvedValue(lead);
      const req = makeReq({ body: { name: "John" } });
      const res = mockRes() as Response;

      await leadController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ lead }));
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "" } });
      const res = mockRes() as Response;

      await leadController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getById", () => {
    it("returns 404 when lead not found", async () => {
      const err = new Error("Lead not found") as Error & { statusCode: number };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await leadController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("convert", () => {
    it("returns 200 with lead, contact, deal on success", async () => {
      const result = {
        lead: { id: "1" },
        contact: { id: "c1" },
        deal: { id: "d1" },
      };
      mockService.convert.mockResolvedValue(result);
      const req = makeReq({ params: { id: "1" }, body: {} });
      const res = mockRes() as Response;

      await leadController.convert(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          lead: result.lead,
          contact: result.contact,
          deal: result.deal,
        }),
      );
    });

    it("returns 400 when lead already converted", async () => {
      const err = new Error("Lead already converted") as Error & {
        statusCode: number;
      };
      err.statusCode = 400;
      mockService.convert.mockRejectedValue(err);
      const req = makeReq({ params: { id: "1" }, body: {} });
      const res = mockRes() as Response;

      await leadController.convert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("assign", () => {
    it("returns 200 with lead on success", async () => {
      const lead = { id: "1", name: "John" };
      mockService.assign.mockResolvedValue(lead);
      const req = makeReq({
        params: { id: "1" },
        body: {
          assignedToId: "550e8400-e29b-41d4-a716-446655440000",
        },
      });
      const res = mockRes() as Response;

      await leadController.assign(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ lead }));
    });

    it("returns 400 on missing assignedToId", async () => {
      const req = makeReq({ params: { id: "1" }, body: {} });
      const res = mockRes() as Response;

      await leadController.assign(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
