/**
 * Site template controller tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { mockRes, makeReq } from "@tests/helpers/controller";

vi.mock("./site-templates.service", () => ({
  default: {
    listMerged: vi.fn(),
    getById: vi.fn(),
    fork: vi.fn(),
    update: vi.fn(),
    deleteFork: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import controller from "./site-templates.controller";
import * as serviceModule from "./site-templates.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

describe("SiteTemplatesController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTemplates", () => {
    it("returns 200 with templates on success", async () => {
      const templates = [
        {
          id: "1",
          slug: "template-1",
          name: "Template 1",
          ownerTenantId: null,
        },
      ];
      mockService.listMerged.mockResolvedValue(templates);

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ templates }),
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.listMerged.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listTemplates(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("forkTemplate", () => {
    it("returns 201 with forked template on success", async () => {
      const fork = {
        id: "fork-1",
        slug: "fork-template-1",
        name: "My Fork",
        parentTemplateId: "parent-1",
        ownerTenantId: "tenant-1",
      };
      mockService.fork.mockResolvedValue(fork);

      const req = makeReq({
        body: { name: "My Fork" },
        params: { id: "parent-1" },
      });
      const res = mockRes() as Response;

      await controller.forkTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ template: fork }),
        }),
      );
    });

    it("returns 404 when parent not found", async () => {
      mockService.fork.mockRejectedValue(new Error("not found"));
      const req = makeReq({ body: { name: "My Fork" }, params: { id: "bad" } });
      const res = mockRes() as Response;

      await controller.forkTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when fork already exists", async () => {
      mockService.fork.mockRejectedValue(new Error("already"));
      const req = makeReq({ body: { name: "My Fork" }, params: { id: "1" } });
      const res = mockRes() as Response;

      await controller.forkTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("updateTemplate", () => {
    it("returns 200 with updated template on success", async () => {
      const updated = {
        id: "1",
        slug: "fork-1",
        name: "Updated Name",
        ownerTenantId: "tenant-1",
      };
      mockService.update.mockResolvedValue(updated);

      const req = makeReq({
        body: { name: "Updated Name" },
        params: { id: "1" },
      });
      const res = mockRes() as Response;

      await controller.updateTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ template: updated }),
        }),
      );
    });

    it("returns 403 when user does not own fork", async () => {
      mockService.update.mockRejectedValue(new Error("do not own"));
      const req = makeReq({ body: { name: "New" }, params: { id: "1" } });
      const res = mockRes() as Response;

      await controller.updateTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("deleteFork", () => {
    it("returns 200 on successful delete", async () => {
      mockService.deleteFork.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "fork-1" } });
      const res = mockRes() as Response;

      await controller.deleteFork(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 403 when fork is not owned by user", async () => {
      mockService.deleteFork.mockRejectedValue(new Error("Cannot delete"));
      const req = makeReq({ params: { id: "fork-1" } });
      const res = mockRes() as Response;

      await controller.deleteFork(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("updateCanonical", () => {
    it("returns 403 for non-platform-admin users", async () => {
      const req = makeReq({ params: { id: "canonical-1" } });
      (req.user as any) = {
        role: "admin",
        id: "u1",
        tenantId: "t1",
        tenantSlug: "test",
      };
      const res = mockRes() as Response;

      await controller.updateCanonical(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 200 for platform admins", async () => {
      const updated = { id: "1", slug: "canonical", name: "Updated" };
      mockService.getById.mockResolvedValue({ ownerTenantId: null });
      mockService.update.mockResolvedValue(updated);

      const req = makeReq({ body: { name: "Updated" }, params: { id: "1" } });
      (req.user as any) = {
        role: "platformAdmin",
        id: "u1",
        tenantId: "t1",
        tenantSlug: "test",
      };
      const res = mockRes() as Response;

      await controller.updateCanonical(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
