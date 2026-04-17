/**
 * Public Orders Controller — unauthenticated guest checkout.
 *
 * Tenant is resolved from the request Host header by the existing
 * `resolveTenantFromHostname` middleware (see public-site router pattern).
 * No JWT needed — this is the only write endpoint on the public API.
 *
 * The response is intentionally minimal: `{ orderCode }`. We don't echo
 * the customer's contact info or the full items list in the response
 * because the page doesn't need it, and keeping the payload slim reduces
 * the temptation to trust the response back into the cart UI.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "@/modules/website-orders/website-orders.service";
import { notifyNewOrder } from "@/modules/website-orders/website-orders.notify";
import { CreateGuestOrderSchema } from "./public-orders.schema";

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

function clientIp(req: Request): string | null {
  // Prefer the same X-Forwarded-For that Caddy / Cloudflare sets so we
  // log the actual visitor, not the proxy.
  const raw = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(raw) ? raw[0] : raw;
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.ip ?? null;
}

class PublicOrdersController {
  createOrder = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const body = CreateGuestOrderSchema.parse(req.body);
      // Normalize items into the concrete CartItemSnapshot shape the
      // service expects. Zod leaves inferred fields as optional under
      // exactOptionalPropertyTypes; this map collapses them.
      const items = body.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        variationId: i.variationId ?? null,
        subVariationId: i.subVariationId ?? null,
        variationLabel: i.variationLabel ?? null,
      }));
      const order = await service.createGuestOrder(tenantId, {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        customerNote: body.customerNote || null,
        items,
        sourceIp: clientIp(req),
        sourceUserAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"].slice(0, 500)
            : null,
      });

      // Fire-and-forget in-app notification fan-out to tenant admins.
      // Errors inside notifyNewOrder are logged and swallowed, so this
      // await is safe and keeps ordering predictable in tests.
      await notifyNewOrder(tenantId, order);

      return res.status(201).json({
        message: "Order received. We'll contact you to confirm.",
        orderCode: order.orderCode,
      });
    } catch (error) {
      const prismaErr = error as { code?: string };
      if (prismaErr?.code === "P2002") {
        return res.status(409).json({
          message:
            "Order could not be placed right now. Please try again in a moment.",
        });
      }
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create public order error")
      );
    }
  };
}

export default new PublicOrdersController();
