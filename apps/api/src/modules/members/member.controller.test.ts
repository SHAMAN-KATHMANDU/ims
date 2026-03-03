import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./member.service", () => ({
  MemberService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    checkMember: vi.fn(),
    bulkUpload: vi.fn(),
    downloadBulkUploadTemplate: vi.fn(),
    downloadMembers: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/utils/phone", () => ({
  parseAndValidatePhone: vi.fn((val: string) => {
    if (!val || String(val).trim() === "") {
      return { valid: false, message: "Phone number is required" };
    }
    if (val === "invalid") {
      return { valid: false, message: "Invalid phone number" };
    }
    return { valid: true, e164: "+9779841234567" };
  }),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import memberController from "./member.controller";
import * as memberServiceModule from "./member.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = memberServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

describe("MemberController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMember", () => {
    it("returns 201 with created member on success", async () => {
      const member = { id: "m1", phone: "+9779841234567", name: "John" };
      mockService.create.mockResolvedValue({ existing: null, member });
      const req = makeReq({ body: { phone: "9841234567", name: "John" } });
      const res = mockRes() as Response;

      await memberController.createMember(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member created successfully",
          member,
        }),
      );
    });

    it("returns 409 when member with phone already exists", async () => {
      const existing = { id: "m1", phone: "+9779841234567" };
      mockService.create.mockResolvedValue({ existing, member: null });
      const req = makeReq({ body: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member with this phone number already exists",
          member: existing,
        }),
      );
    });

    it("returns 400 when phone is missing (Zod validation)", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await memberController.createMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.createMember(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllMembers", () => {
    it("returns 200 with paginated members on success", async () => {
      const result = {
        data: [{ id: "m1", phone: "+9779841234567" }],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
      };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await memberController.getAllMembers(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith("t1", req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Members fetched successfully",
          ...result,
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await memberController.getAllMembers(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getMemberByPhone", () => {
    it("returns 200 with member on success", async () => {
      const member = { id: "m1", phone: "+9779841234567", name: "John" };
      mockService.findByPhone.mockResolvedValue(member);
      const req = makeReq({ params: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.getMemberByPhone(req, res);

      expect(mockService.findByPhone).toHaveBeenCalledWith(
        "t1",
        "+9779841234567",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member fetched successfully",
          member,
        }),
      );
    });

    it("returns 400 when phone is invalid", async () => {
      const parseAndValidatePhone = await import("@/utils/phone").then(
        (m) => m.parseAndValidatePhone as ReturnType<typeof vi.fn>,
      );
      parseAndValidatePhone.mockReturnValueOnce({
        valid: false,
        message: "Invalid phone number",
      });

      const req = makeReq({ params: { phone: "invalid" } });
      const res = mockRes() as Response;

      await memberController.getMemberByPhone(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid phone number" }),
      );
      expect(mockService.findByPhone).not.toHaveBeenCalled();
    });

    it("returns 404 when member not found", async () => {
      mockService.findByPhone.mockResolvedValue(null);
      const req = makeReq({ params: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.getMemberByPhone(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Member not found",
      });
    });
  });

  describe("getMemberById", () => {
    it("returns 200 with member on success", async () => {
      const member = { id: "m1", phone: "+9779841234567", sales: [] };
      mockService.findById.mockResolvedValue(member);
      const req = makeReq({ params: { id: "m1" } });
      const res = mockRes() as Response;

      await memberController.getMemberById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "m1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member fetched successfully",
          member,
        }),
      );
    });

    it("returns 404 when member not found", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = makeReq({ params: { id: "m1" } });
      const res = mockRes() as Response;

      await memberController.getMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateMember", () => {
    it("returns 200 with updated member on success", async () => {
      const member = { id: "m1", phone: "+9779841234567", name: "Jane" };
      mockService.update.mockResolvedValue({ conflict: false, member });
      const req = makeReq({
        params: { id: "m1" },
        body: { name: "Jane" },
      });
      const res = mockRes() as Response;

      await memberController.updateMember(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "m1",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member updated successfully",
          member,
        }),
      );
    });

    it("returns 404 when member not found", async () => {
      mockService.update.mockResolvedValue(null);
      const req = makeReq({ params: { id: "m1" }, body: { name: "Jane" } });
      const res = mockRes() as Response;

      await memberController.updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when phone already taken", async () => {
      mockService.update.mockResolvedValue({ conflict: true, member: null });
      const req = makeReq({
        params: { id: "m1" },
        body: { phone: "9841234568" },
      });
      const res = mockRes() as Response;

      await memberController.updateMember(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Phone number already taken by another member",
        }),
      );
    });
  });

  describe("checkMember", () => {
    it("returns 200 with isMember true when active member found", async () => {
      const member = {
        id: "m1",
        phone: "+9779841234567",
        name: "John",
        isActive: true,
      };
      mockService.checkMember.mockResolvedValue(member);
      const req = makeReq({ params: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.checkMember(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        isMember: true,
        member,
      });
    });

    it("returns 200 with isMember false when no member", async () => {
      mockService.checkMember.mockResolvedValue(null);
      const req = makeReq({ params: { phone: "9841234567" } });
      const res = mockRes() as Response;

      await memberController.checkMember(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        isMember: false,
        member: null,
      });
    });
  });

  describe("bulkUploadMembers", () => {
    it("returns 400 when no file uploaded", async () => {
      const req = makeReq({ file: undefined });
      const res = mockRes() as Response;

      await memberController.bulkUploadMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No file uploaded",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        }),
      );
      expect(mockService.bulkUpload).not.toHaveBeenCalled();
    });

    it("returns 200 with bulk upload result on success", async () => {
      const result = {
        created: [{ id: "m1", phone: "+9779841234567", name: "John" }],
        skipped: [],
        errors: [],
        rows: [],
      };
      mockService.bulkUpload.mockResolvedValue(result);
      const req = makeReq({
        file: { path: "/tmp/file.xlsx", originalname: "file.xlsx" },
      });
      const res = mockRes() as Response;

      await memberController.bulkUploadMembers(req, res);

      expect(mockService.bulkUpload).toHaveBeenCalledWith(
        "t1",
        "/tmp/file.xlsx",
        "file.xlsx",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Bulk upload completed",
          summary: {
            total: 0,
            created: 1,
            skipped: 0,
            errors: 0,
          },
          created: result.created,
          skipped: result.skipped,
          errors: result.errors,
        }),
      );
    });
  });

  describe("downloadBulkUploadTemplate", () => {
    it("returns Excel buffer with correct headers", async () => {
      const buffer = Buffer.from("xlsx");
      mockService.downloadBulkUploadTemplate.mockResolvedValue({
        buffer,
        filename: "members_bulk_upload_template.xlsx",
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await memberController.downloadBulkUploadTemplate(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="members_bulk_upload_template.xlsx"',
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe("downloadMembers", () => {
    it("returns 200 with Excel buffer on success", async () => {
      const buffer = Buffer.from("xlsx");
      mockService.downloadMembers.mockResolvedValue({
        buffer,
        filename: "members_2024-01-01.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const req = makeReq({ query: { format: "excel" } });
      const res = mockRes() as Response;

      await memberController.downloadMembers(req, res);

      expect(mockService.downloadMembers).toHaveBeenCalledWith(
        "t1",
        "excel",
        undefined,
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it("returns 404 when no members found", async () => {
      const { createError } = await import("@/middlewares/errorHandler");
      mockService.downloadMembers.mockRejectedValue(
        createError("No members found to export", 404),
      );
      const req = makeReq({ query: { format: "excel" } });
      const res = mockRes() as Response;

      await memberController.downloadMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "No members found to export",
      });
    });

    it("returns 400 for invalid format", async () => {
      const req = makeReq({ query: { format: "pdf" } });
      const res = mockRes() as Response;

      await memberController.downloadMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.downloadMembers).not.toHaveBeenCalled();
    });
  });
});
