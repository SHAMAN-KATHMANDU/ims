import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import memberService, { MemberService } from "./member.service";
import { CreateMemberSchema, UpdateMemberSchema } from "./member.schema";
import { parseAndValidatePhone } from "@/utils/phone";
import fs from "fs";

function getParam(req: Request, key: "id" | "phone"): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

class MemberController {
  constructor(private service: MemberService) {}

  createMember = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateMemberSchema.parse(req.body);

      const { existing, member } = await this.service.create(tenantId, body);

      if (existing) {
        return res.status(409).json({
          message: "Member with this phone number already exists",
          member: existing,
        });
      }

      return res.status(201).json({
        message: "Member created successfully",
        member: member!,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Create member error");
    }
  };

  getAllMembers = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);

      return res.status(200).json({
        message: "Members fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all members error");
    }
  };

  getMemberByPhone = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const phone = getParam(req, "phone");

      const parsed = parseAndValidatePhone(phone);
      if (!parsed.valid) {
        const err = parsed as { valid: false; message: string };
        return res.status(400).json({ message: err.message });
      }

      const member = await this.service.findByPhone(tenantId, parsed.e164);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      return res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get member by phone error");
    }
  };

  getMemberById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");

      const member = await this.service.findById(tenantId, id);

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      return res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get member by ID error");
    }
  };

  updateMember = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const body = UpdateMemberSchema.parse(req.body);

      const result = await this.service.update(tenantId, id, body);

      if (!result) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (result.conflict) {
        return res.status(409).json({
          message: "Phone number already taken by another member",
        });
      }

      return res.status(200).json({
        message: "Member updated successfully",
        member: result.member,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Update member error");
    }
  };

  checkMember = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const phone = getParam(req, "phone");

      const parsed = parseAndValidatePhone(phone);
      if (!parsed.valid) {
        const err = parsed as { valid: false; message: string };
        return res.status(400).json({ message: err.message });
      }

      const member = await this.service.checkMember(tenantId, parsed.e164);

      return res.status(200).json({
        isMember: !!member && member.isActive,
        member: member || null,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Check member error");
    }
  };

  bulkUploadMembers = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;

      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          created: [],
          skipped: [],
          errors: [],
        });
      }

      let result;
      try {
        result = await this.service.bulkUpload(
          tenantId,
          req.file.path,
          req.file.originalname,
        );
      } catch (err: unknown) {
        const bulkErr = err as { status?: number; body?: unknown };
        if (bulkErr?.status && bulkErr?.body) {
          return res.status(bulkErr.status).json(bulkErr.body);
        }
        throw err;
      }

      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (e) {
        console.error("Error cleaning up file:", e);
      }

      return res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: result.rows.length,
          created: result.created.length,
          skipped: result.skipped.length,
          errors: result.errors.length,
        },
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      });
    } catch (error: unknown) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      return sendControllerError(req, res, error, "Bulk upload members error");
    }
  };

  downloadBulkUploadTemplate = async (req: Request, res: Response) => {
    try {
      const { buffer, filename } =
        await this.service.downloadBulkUploadTemplate();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  };

  downloadMembers = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const format = ((req.query.format as string)?.toLowerCase() ||
        "excel") as "excel" | "csv";
      const idsParam = req.query.ids as string | undefined;

      if (format !== "excel" && format !== "csv") {
        return res.status(400).json({
          message: "Invalid format. Supported formats: excel, csv",
        });
      }

      let memberIds: string[] | undefined;
      if (idsParam) {
        memberIds = idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const result = await this.service.downloadMembers(
        tenantId,
        format,
        memberIds,
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      return res.send(result.buffer);
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr?.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Download members error");
    }
  };
}

export default new MemberController(memberService);
