import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { ok, fail } from "@/shared/response";
import service from "./forms.service";
import { CreateFormSchema, UpdateFormSchema } from "./forms.schema";

class FormsController {
  list = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const forms = await service.list(tenantId);
      return ok(res, { forms });
    } catch (error) {
      return sendControllerError(req, res, error, "list forms");
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const form = await service.get(tenantId, req.params.id ?? "");
      return ok(res, { form });
    } catch (error) {
      return sendControllerError(req, res, error, "get form");
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateFormSchema.parse(req.body);
      const form = await service.create(tenantId, body);
      return ok(res, { form }, 201);
    } catch (error) {
      return sendControllerError(req, res, error, "create form");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = UpdateFormSchema.parse(req.body);
      const form = await service.update(tenantId, req.params.id ?? "", body);
      return ok(res, { form });
    } catch (error) {
      return sendControllerError(req, res, error, "update form");
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      await service.delete(tenantId, req.params.id ?? "");
      return ok(res, { message: "Form deleted" });
    } catch (error) {
      return sendControllerError(req, res, error, "delete form");
    }
  };

  listSubmissions = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await service.listSubmissions(
        tenantId,
        req.params.id ?? "",
        limit,
        offset,
      );
      return ok(res, {
        submissions: result.submissions,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      });
    } catch (error) {
      return sendControllerError(req, res, error, "list submissions");
    }
  };
}

export default new FormsController();
