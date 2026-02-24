import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { transfersService } from "./transfers.service";

class TransferController {
  async createTransfer(req: Request, res: Response) {
    const auth = req.authContext!;

    const { fromLocationId, toLocationId, items, notes } = req.body;
    const ctx = {
      ip: (req as any).ip ?? (req.socket as any)?.remoteAddress,
      userAgent: req.get("user-agent") ?? undefined,
    };
    const transfer = await transfersService.create(
      auth.tenantId,
      auth.userId,
      { fromLocationId, toLocationId, items, notes },
      ctx,
    );
    return ok(res, { transfer }, 201, "Transfer request created successfully");
  }

  async getAllTransfers(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      status?:
        | "PENDING"
        | "APPROVED"
        | "IN_TRANSIT"
        | "COMPLETED"
        | "CANCELLED";
      fromLocationId?: string;
      toLocationId?: string;
      locationId?: string;
    }>(req, res);

    const result = await transfersService.getAll(auth.tenantId, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Transfers fetched successfully",
    );
  }

  async getTransferById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const transfer = await transfersService.getById(id, auth.tenantId);
    return ok(res, { transfer }, 200, "Transfer fetched successfully");
  }

  async approveTransfer(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const transfer = await transfersService.approve(
      id,
      auth.tenantId,
      auth.userId,
    );
    return ok(res, { transfer }, 200, "Transfer approved successfully");
  }

  async startTransit(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const transfer = await transfersService.startTransit(
      id,
      auth.tenantId,
      auth.userId,
    );
    return ok(
      res,
      { transfer },
      200,
      "Transfer marked as in transit. Stock deducted from source.",
    );
  }

  async completeTransfer(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const transfer = await transfersService.complete(
      id,
      auth.tenantId,
      auth.userId,
    );
    return ok(
      res,
      { transfer },
      200,
      "Transfer completed successfully. Stock added to destination.",
    );
  }

  async cancelTransfer(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const { transfer, stockRestored } = await transfersService.cancel(
      id,
      auth.tenantId,
      auth.userId,
      reason,
    );
    const message =
      "Transfer cancelled successfully" +
      (stockRestored ? ". Stock restored to source location." : ".");
    return ok(res, { transfer }, 200, message);
  }

  async getTransferLogs(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id: transferId } = req.params as { id: string };
    const { transferCode, logs } = await transfersService.getTransferLogs(
      transferId,
      auth.tenantId,
    );
    return ok(
      res,
      { transferCode, logs },
      200,
      "Transfer logs fetched successfully",
    );
  }
}

export default new TransferController();
