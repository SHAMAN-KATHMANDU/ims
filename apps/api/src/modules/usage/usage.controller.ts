/**
 * Usage Controller — tenant-facing endpoints for resource usage and add-on management.
 */

import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { usageService } from "./usage.service";

class UsageController {
  async getUsage(req: Request, res: Response) {
    const auth = req.authContext!;

    const { usage, plan } = await usageService.getUsage(auth.tenantId);
    return ok(res, { usage, plan }, 200);
  }

  async getResourceUsage(req: Request, res: Response) {
    const auth = req.authContext!;

    const { resource } = req.params as { resource: string };
    const data = await usageService.getResourceUsage(
      auth.tenantId,
      resource as import("@repo/shared").LimitedResource,
    );
    return ok(res, data, 200);
  }

  async requestAddOn(req: Request, res: Response) {
    const auth = req.authContext!;

    const { type, quantity, notes } = req.body;
    const { addOn } = await usageService.requestAddOn(auth.tenantId, {
      type,
      quantity,
      notes,
    });
    return ok(
      res,
      { addOn },
      201,
      "Add-on request submitted. A platform administrator will review and approve it.",
    );
  }

  async getAddOns(req: Request, res: Response) {
    const auth = req.authContext!;

    const { addOns } = await usageService.getAddOns(auth.tenantId);
    return ok(res, { addOns }, 200);
  }

  async getPlansWithPricing(req: Request, res: Response) {
    const auth = req.authContext!;

    const { plans } = await usageService.getPlansWithPricing();
    return ok(res, { plans }, 200);
  }

  async getAddOnPricing(req: Request, res: Response) {
    const auth = req.authContext!;

    const { pricing } = await usageService.getAddOnPricing(auth.tenantId);
    return ok(res, { pricing }, 200);
  }
}

export default new UsageController();
