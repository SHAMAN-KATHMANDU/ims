import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./contact.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getTags: vi.fn(),
    createTag: vi.fn(),
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    addAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    addCommunication: vi.fn(),
    importCsv: vi.fn(),
    exportCsv: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import contactController from "./contact.controller";
import * as contactServiceModule from "./contact.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = contactServiceModule.default as unknown as Record<
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

describe("ContactController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with contact on success", async () => {
      const contact = { id: "1", firstName: "John" };
      mockService.create.mockResolvedValue(contact);
      const req = makeReq({ body: { firstName: "John" } });
      const res = mockRes() as Response;

      await contactController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ contact }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { firstName: "" } });
      const res = mockRes() as Response;

      await contactController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getById", () => {
    it("returns 404 when contact not found", async () => {
      const err = new Error("Contact not found") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await contactController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
