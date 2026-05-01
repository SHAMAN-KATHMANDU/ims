import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { ok, fail } from "@/shared/response";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import auditRepository from "@/modules/audit/audit.repository";
import defaultService, {
  PublicApiKeysService,
} from "./public-api-keys.service";
import { CreatePublicApiKeySchema } from "./public-api-keys.schema";

export class PublicApiKeysController {
  constructor(private readonly service: PublicApiKeysService) {}

  create = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = CreatePublicApiKeySchema.parse(req.body);
      const issued = await this.service.issue(tenantId, body);

      // Audit log key issuance — never include the key itself.
      auditRepository
        .create({
          tenantId,
          userId,
          action: "CREATE",
          resource: "PUBLIC_API_KEY",
          resourceId: issued.record.id,
          details: {
            prefix: issued.record.prefix,
            tenantDomainId: issued.record.tenantDomainId,
            hostname: issued.record.tenantDomain.hostname,
          },
          ip: typeof req.ip === "string" ? req.ip : undefined,
          userAgent: req.get("user-agent"),
        })
        .catch(() => {
          /* non-fatal */
        });

      return ok(
        res,
        {
          // The full key string is shown ONCE — caller must store it now.
          key: issued.key,
          apiKey: this.service.toView(issued.record),
        },
        201,
      );
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return fail(res, appErr.message, appErr.statusCode);
      }
      return sendControllerError(req, res, error, "Create API key error");
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const apiKeys = await this.service.list(tenantId);
      return ok(res, { apiKeys });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return fail(res, appErr.message, appErr.statusCode);
      }
      return sendControllerError(req, res, error, "List API keys error");
    }
  };

  rotate = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const result = await this.service.rotate(id, tenantId);

      auditRepository
        .create({
          tenantId,
          userId,
          action: "UPDATE",
          resource: "PUBLIC_API_KEY",
          resourceId: result.issued.record.id,
          details: {
            rotatedFromId: result.revokedId,
            prefix: result.issued.record.prefix,
          },
          ip: typeof req.ip === "string" ? req.ip : undefined,
          userAgent: req.get("user-agent"),
        })
        .catch(() => {
          /* non-fatal */
        });

      return ok(res, {
        key: result.issued.key,
        apiKey: this.service.toView(result.issued.record),
        revokedId: result.revokedId,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return fail(res, appErr.message, appErr.statusCode);
      }
      return sendControllerError(req, res, error, "Rotate API key error");
    }
  };

  revoke = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const revoked = await this.service.revoke(id, tenantId);

      auditRepository
        .create({
          tenantId,
          userId,
          action: "DELETE",
          resource: "PUBLIC_API_KEY",
          resourceId: revoked.id,
          details: { prefix: revoked.prefix },
          ip: typeof req.ip === "string" ? req.ip : undefined,
          userAgent: req.get("user-agent"),
        })
        .catch(() => {
          /* non-fatal */
        });

      return ok(res, { id: revoked.id, revokedAt: revoked.revokedAt });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode) {
        return fail(res, appErr.message, appErr.statusCode);
      }
      return sendControllerError(req, res, error, "Revoke API key error");
    }
  };
}

export default new PublicApiKeysController(defaultService);
