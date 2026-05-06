/**
 * Public Snippets Controller — unauthenticated read of a single snippet
 * by id. Used by the tenant-site renderer to dereference `snippet-ref`
 * blocks at request time. Tenant resolved from Host header.
 */

import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function getTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    const err = new Error("Host not resolved") as AppError;
    err.statusCode = 400;
    throw err;
  }
  return tenantId;
}

class PublicSnippetsController {
  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const id = getParam(req, "id");
      const snippet = await prisma.siteSnippet.findFirst({
        where: { id, tenantId },
        select: { id: true, slug: true, title: true, body: true },
      });
      if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
      }
      return res.status(200).json({ message: "OK", snippet });
    } catch (error) {
      return sendControllerError(req, res, error, "Public snippet read error");
    }
  };
}

export default new PublicSnippetsController();
