import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./crm-settings.service", () => ({
  default: {
    getAllSources: vi.fn(),
    createSource: vi.fn(),
    updateSource: vi.fn(),
    deleteSource: vi.fn(),
    getAllJourneyTypes: vi.fn(),
    createJourneyType: vi.fn(),
    updateJourneyType: vi.fn(),
    deleteJourneyType: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import crmSettingsController from "./crm-settings.controller";
import * as serviceModule from "./crm-settings.service";
import { sendControllerError } from "@/utils/controllerError";

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

describe("CrmSettingsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllSources", () => {
    it("returns 200 with sources on success", async () => {
      const sources = [{ id: "1", name: "Website", createdAt: new Date() }];
      mockService.getAllSources.mockResolvedValue(sources);
      const req = makeReq();
      const res = mockRes() as Response;

      await crmSettingsController.getAllSources(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ sources }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getAllSources.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await crmSettingsController.getAllSources(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("createSource", () => {
    it("returns 201 with created source on success", async () => {
      const source = { id: "1", name: "Website", createdAt: new Date() };
      mockService.createSource.mockResolvedValue(source);
      const req = makeReq({ body: { name: "Website" } });
      const res = mockRes() as Response;

      await crmSettingsController.createSource(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ source }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "" } });
      const res = mockRes() as Response;

      await crmSettingsController.createSource(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when source name already exists", async () => {
      const err = new Error("A source with this name already exists") as any;
      err.statusCode = 409;
      mockService.createSource.mockRejectedValue(err);
      const req = makeReq({ body: { name: "Website" } });
      const res = mockRes() as Response;

      await crmSettingsController.createSource(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("updateSource", () => {
    it("returns 200 with updated source on success", async () => {
      const source = { id: "1", name: "Referral", createdAt: new Date() };
      mockService.updateSource.mockResolvedValue(source);
      const req = makeReq({ params: { id: "1" }, body: { name: "Referral" } });
      const res = mockRes() as Response;

      await crmSettingsController.updateSource(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ source }),
      );
    });

    it("returns 404 when source not found", async () => {
      const err = new Error("Source not found") as any;
      err.statusCode = 404;
      mockService.updateSource.mockRejectedValue(err);
      const req = makeReq({
        params: { id: "999" },
        body: { name: "Referral" },
      });
      const res = mockRes() as Response;

      await crmSettingsController.updateSource(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("deleteSource", () => {
    it("returns 200 on successful delete", async () => {
      mockService.deleteSource.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "1" } });
      const res = mockRes() as Response;

      await crmSettingsController.deleteSource(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when source not found", async () => {
      const err = new Error("Source not found") as any;
      err.statusCode = 404;
      mockService.deleteSource.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await crmSettingsController.deleteSource(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getAllJourneyTypes", () => {
    it("returns 200 with journey types on success", async () => {
      const journeyTypes = [
        { id: "1", name: "Prospect", createdAt: new Date() },
      ];
      mockService.getAllJourneyTypes.mockResolvedValue(journeyTypes);
      const req = makeReq();
      const res = mockRes() as Response;

      await crmSettingsController.getAllJourneyTypes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ journeyTypes }),
      );
    });
  });

  describe("createJourneyType", () => {
    it("returns 201 with created journey type on success", async () => {
      const journeyType = { id: "1", name: "Prospect", createdAt: new Date() };
      mockService.createJourneyType.mockResolvedValue(journeyType);
      const req = makeReq({ body: { name: "Prospect" } });
      const res = mockRes() as Response;

      await crmSettingsController.createJourneyType(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ journeyType }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "" } });
      const res = mockRes() as Response;

      await crmSettingsController.createJourneyType(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updateJourneyType", () => {
    it("returns 200 with updated journey type on success", async () => {
      const journeyType = {
        id: "1",
        name: "Customer",
        createdAt: new Date(),
      };
      mockService.updateJourneyType.mockResolvedValue(journeyType);
      const req = makeReq({
        params: { id: "1" },
        body: { name: "Customer" },
      });
      const res = mockRes() as Response;

      await crmSettingsController.updateJourneyType(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ journeyType }),
      );
    });
  });

  describe("deleteJourneyType", () => {
    it("returns 200 on successful delete", async () => {
      mockService.deleteJourneyType.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "1" } });
      const res = mockRes() as Response;

      await crmSettingsController.deleteJourneyType(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
