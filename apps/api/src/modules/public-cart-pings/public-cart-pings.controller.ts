/**
 * Public Cart Pings Controller — unauthenticated activity pings from the
 * tenant-site CartProvider.
 *
 * Tenant is resolved from the Host header by `resolveTenantFromHostname`.
 * Response is intentionally empty (`204 No Content`) — the client fires
 * and forgets; it doesn't render anything with the response.
 *
 * Validation errors return 400 but the CartProvider ignores them; this
 * endpoint is best-effort. A failed ping just means the next one wins.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-cart-pings.service";
import { CartPingSchema } from "./public-cart-pings.schema";

function getTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    const err = new Error("Host not resolved") as AppError;
    err.statusCode = 400;
    throw err;
  }
  return tenantId;
}

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

class PublicCartPingsController {
  recordPing = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const body = CartPingSchema.parse(req.body);

      const items = body.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      }));

      await service.recordCartPing(tenantId, {
        sessionKey: body.sessionKey,
        items,
        customerName: body.customerName || null,
        customerPhone: body.customerPhone || null,
        customerEmail: body.customerEmail || null,
      });

      return res.status(204).end();
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Record cart ping error")
      );
    }
  };
}

export default new PublicCartPingsController();
