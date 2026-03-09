import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import transferService from "./transfer.service";
import {
  CreateTransferSchema,
  GetAllTransfersQuerySchema,
  CancelTransferSchema,
} from "./transfer.schema";

function getParamId(req: Request): string {
  const val = req.params.id;
  return Array.isArray(val) ? val[0] : val;
}

class TransferController {
  createTransfer = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = CreateTransferSchema.parse(req.body);

      const transfer = await transferService.create(tenantId, userId, body, {
        ip:
          (req as { ip?: string }).ip ??
          (req.socket as { remoteAddress?: string })?.remoteAddress,
        userAgent: req.get("user-agent") ?? undefined,
      });

      return res.status(201).json({
        message: "Transfer request created successfully",
        transfer,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const err = error as AppError & { insufficientStock?: unknown };
      if (err.statusCode === 400 && err.insufficientStock) {
        return res.status(400).json({
          message: err.message,
          insufficientStock: err.insufficientStock,
        });
      }
      if (err.statusCode === 404 || err.statusCode === 400) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Create transfer error");
    }
  };

  getAllTransfers = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = GetAllTransfersQuerySchema.parse(req.query);

      const result = await transferService.findAll(tenantId, query);

      return res.status(200).json({
        message: "Transfers fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get all transfers error");
    }
  };

  getTransferById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParamId(req);

      const transfer = await transferService.findById(tenantId, id);

      return res.status(200).json({
        message: "Transfer fetched successfully",
        transfer,
      });
    } catch (error: unknown) {
      const err = error as AppError;
      if (err.statusCode === 404) {
        return res.status(404).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Get transfer by ID error");
    }
  };

  approveTransfer = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = getParamId(req);

      const transfer = await transferService.approve(tenantId, userId, id);

      return res.status(200).json({
        message: "Transfer approved successfully",
        transfer,
      });
    } catch (error: unknown) {
      const err = error as AppError & { insufficientStock?: unknown };
      if (err.statusCode === 404 || err.statusCode === 400) {
        const body: { message: string; insufficientStock?: unknown } = {
          message: err.message,
        };
        if (err.insufficientStock)
          body.insufficientStock = err.insufficientStock;
        return res.status(err.statusCode!).json(body);
      }
      return sendControllerError(req, res, error, "Approve transfer error");
    }
  };

  startTransit = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = getParamId(req);

      const transfer = await transferService.startTransit(tenantId, userId, id);

      return res.status(200).json({
        message: "Transfer marked as in transit. Stock deducted from source.",
        transfer,
      });
    } catch (error: unknown) {
      const err = error as AppError;
      if (err.statusCode === 404 || err.statusCode === 400) {
        return res.status(err.statusCode!).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Start transit error");
    }
  };

  completeTransfer = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = getParamId(req);

      const transfer = await transferService.complete(tenantId, userId, id);

      return res.status(200).json({
        message: "Transfer completed successfully. Stock added to destination.",
        transfer,
      });
    } catch (error: unknown) {
      const err = error as AppError;
      if (err.statusCode === 404 || err.statusCode === 400) {
        return res.status(err.statusCode!).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Complete transfer error");
    }
  };

  cancelTransfer = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = getParamId(req);
      const body = CancelTransferSchema.parse(req.body ?? {});

      const { transfer, previousStatus } = await transferService.cancel(
        tenantId,
        userId,
        id,
        body,
      );

      const msg =
        previousStatus === "IN_TRANSIT"
          ? "Transfer cancelled successfully. Stock restored to source location."
          : "Transfer cancelled successfully.";

      return res.status(200).json({
        message: msg,
        transfer,
      });
    } catch (error: unknown) {
      const err = error as AppError;
      if (err.statusCode === 404 || err.statusCode === 400) {
        return res.status(err.statusCode!).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Cancel transfer error");
    }
  };

  getTransferLogs = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParamId(req);

      const { transferCode, logs } = await transferService.getLogs(
        tenantId,
        id,
      );

      return res.status(200).json({
        message: "Transfer logs fetched successfully",
        transferCode,
        logs,
      });
    } catch (error: unknown) {
      const err = error as AppError;
      if (err.statusCode === 404) {
        return res.status(404).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Get transfer logs error");
    }
  };
}

export default new TransferController();
