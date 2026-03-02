import { Request, Response } from "express";
import { ZodError } from "zod";
import { CreateCompanySchema, UpdateCompanySchema } from "./company.schema";
import companyService from "./company.service";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class CompanyController {
  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateCompanySchema.parse(req.body);
      const company = await companyService.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Company created successfully", company });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create company error")
      );
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await companyService.getAll(tenantId, req.query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get companies error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const company = await companyService.getById(tenantId, id);
      return res.status(200).json({ message: "OK", company });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get company by id error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const body = UpdateCompanySchema.parse(req.body);
      const company = await companyService.update(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Company updated successfully", company });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update company error")
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await companyService.delete(tenantId, id);
      return res.status(200).json({ message: "Company deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete company error")
      );
    }
  };

  listForSelect = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const companies = await companyService.listForSelect(tenantId);
      return res.status(200).json({ message: "OK", companies });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "List companies for select error",
      );
    }
  };
}

export default new CompanyController();
