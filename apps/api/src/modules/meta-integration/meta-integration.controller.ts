import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  AddCredentialSchema,
  TestCredentialSchema,
  UpsertAppCredentialsSchema,
} from "./meta-integration.schema";
import metaIntegrationService from "./meta-integration.service";
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

const handleZodError = (res: Response, error: unknown): Response | null => {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
};

class MetaIntegrationController {
  getSummary = async (req: Request, res: Response) => {
    try {
      const summary = await metaIntegrationService.getSummary(
        req.user!.tenantId,
      );
      return res.status(200).json({ message: "OK", integration: summary });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get Meta integration error");
    }
  };

  upsertAppCredentials = async (req: Request, res: Response) => {
    try {
      const body = UpsertAppCredentialsSchema.parse(req.body);
      const summary = await metaIntegrationService.upsertAppCredentials(
        req.user!.tenantId,
        body,
      );
      return res
        .status(200)
        .json({ message: "Meta app credentials saved", integration: summary });
    } catch (error: unknown) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Save Meta app credentials error")
      );
    }
  };

  regenerateWebhookToken = async (req: Request, res: Response) => {
    try {
      const summary = await metaIntegrationService.regenerateWebhookToken(
        req.user!.tenantId,
      );
      return res.status(200).json({
        message: "Webhook verify token regenerated",
        integration: summary,
      });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Regenerate webhook token error")
      );
    }
  };

  addCredential = async (req: Request, res: Response) => {
    try {
      const body = AddCredentialSchema.parse(req.body);
      const summary = await metaIntegrationService.addCredential(
        req.user!.tenantId,
        body,
      );
      return res
        .status(201)
        .json({ message: "Access token saved", integration: summary });
    } catch (error: unknown) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Add Meta credential error")
      );
    }
  };

  testCredential = async (req: Request, res: Response) => {
    try {
      const body = TestCredentialSchema.parse(req.body);
      const result = await metaIntegrationService.testCredential(
        req.user!.tenantId,
        body,
      );
      return res.status(200).json({ message: "Connection OK", result });
    } catch (error: unknown) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Test Meta credential error")
      );
    }
  };

  deleteCredential = async (req: Request, res: Response) => {
    try {
      const summary = await metaIntegrationService.deleteCredential(
        req.user!.tenantId,
        req.params.id,
      );
      return res
        .status(200)
        .json({ message: "Access token removed", integration: summary });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete Meta credential error")
      );
    }
  };
}

export default new MetaIntegrationController();
