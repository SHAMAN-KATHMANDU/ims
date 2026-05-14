import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateUserSchema,
  UpdateUserSchema,
  ApprovePasswordResetSchema,
  ListPasswordResetRequestsQuerySchema,
} from "./user.schema";
import userService, { UserService } from "./user.service";

class UserController {
  constructor(private service: UserService) {}

  createUser = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateUserSchema.parse(req.body);
      const user = await this.service.create(tenantId, body);
      return res.status(201).json({
        message: `User created successfully with username ${body.username}`,
        user,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode === 409) {
        return res.status(409).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Create user error");
    }
  };

  getAllUsers = async (req: Request, res: Response) => {
    try {
      const result = await this.service.findAll(req.query);
      return res
        .status(200)
        .json({ message: "Users fetched successfully", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all users error");
    }
  };

  getUserById = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const user = await this.service.findById(id);
      return res
        .status(200)
        .json({ message: "User fetched successfully", user });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get user by ID error");
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const requestingUserId = req.user!.id;
      const body = UpdateUserSchema.parse(req.body);
      const user = await this.service.update(id, requestingUserId, body);
      return res
        .status(200)
        .json({ message: "User updated successfully", user });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update user error");
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const requestingUserId = req.user!.id;
      await this.service.delete(id, requestingUserId);
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({ message: appErr.message });
      }
      if (appErr.statusCode === 403) {
        return res.status(403).json({ message: appErr.message });
      }
      if (appErr.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Delete user error");
    }
  };

  getPasswordResetRequests = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const parsed = ListPasswordResetRequestsQuerySchema.safeParse(req.query);
      const data = parsed.success ? parsed.data : undefined;
      const query =
        data && data.page != null && data.limit != null
          ? {
              page: data.page,
              limit: data.limit,
              search: data.search,
            }
          : undefined;
      const result = await this.service.getPasswordResetRequests(
        tenantId,
        query,
      );
      return res.status(200).json({
        message: "Password reset requests fetched",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get password reset requests error",
      );
    }
  };

  approveResetRequest = async (req: Request, res: Response) => {
    try {
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;
      const tenantId = req.user!.tenantId;
      const handledById = req.user!.id;
      const body = ApprovePasswordResetSchema.parse(req.body);
      await this.service.approveResetRequest(
        requestId!,
        tenantId,
        handledById,
        body,
      );
      return res
        .status(200)
        .json({ message: "Password reset approved. User can now log in." });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Approve password reset error",
      );
    }
  };

  escalateResetRequest = async (req: Request, res: Response) => {
    try {
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;
      const tenantId = req.user!.tenantId;
      const result = await this.service.escalateResetRequest(
        requestId!,
        tenantId,
      );
      return res.status(200).json({
        message: "Request escalated to platform admin",
        request: result,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Escalate password reset error",
      );
    }
  };

  rejectResetRequest = async (req: Request, res: Response) => {
    try {
      const requestId = Array.isArray(req.params.requestId)
        ? req.params.requestId[0]
        : req.params.requestId;
      const tenantId = req.user!.tenantId;
      const handledById = req.user!.id;
      await this.service.rejectResetRequest(requestId!, tenantId, handledById);
      return res
        .status(200)
        .json({ message: "Password reset request rejected" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Reject password reset error",
      );
    }
  };
}

export default new UserController(userService);
