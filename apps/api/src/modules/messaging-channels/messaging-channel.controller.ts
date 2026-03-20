import { Request, Response } from "express";
import { ZodError } from "zod";
import type { MessagingChannel } from "@prisma/client";
import {
  CompleteManualConnectSchema,
  ConnectChannelSchema,
  RegisterManualWebhookVerifySchema,
  UpdateChannelSchema,
} from "./messaging-channel.schema";
import messagingChannelService from "./messaging-channel.service";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

/** Never return encrypted credentials to the client. */
function toPublicChannel<T extends MessagingChannel>(channel: T) {
  const { credentialsEnc: _omit, ...rest } = channel;
  return rest;
}

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class MessagingChannelController {
  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const channels = await messagingChannelService.getAll(tenantId);
      return res.status(200).json({
        message: "OK",
        channels: channels.map(toPublicChannel),
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get channels error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const channel = await messagingChannelService.getById(
        tenantId,
        req.params.id,
      );
      return res
        .status(200)
        .json({ message: "OK", channel: toPublicChannel(channel) });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get channel error")
      );
    }
  };

  connect = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = ConnectChannelSchema.parse(req.body);
      const channel = await messagingChannelService.connect(tenantId, body);
      return res.status(201).json({
        message: "Channel connected successfully",
        channel: toPublicChannel(channel),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Connect channel error")
      );
    }
  };

  registerManualWebhookVerify = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = RegisterManualWebhookVerifySchema.parse(req.body);
      const channel = await messagingChannelService.registerManualWebhookVerify(
        tenantId,
        body,
      );
      return res.status(201).json({
        message:
          "Verify token saved. Use it in Meta webhook settings, click Verify and save, then complete page credentials.",
        channel: toPublicChannel(channel),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(
          req,
          res,
          error,
          "Register manual webhook verify error",
        )
      );
    }
  };

  completeManualConnect = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CompleteManualConnectSchema.parse(req.body);
      const channel = await messagingChannelService.completeManualConnect(
        tenantId,
        req.params.channelId,
        body,
      );
      return res.status(200).json({
        message: "Channel connected successfully (manual)",
        channel: toPublicChannel(channel),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Complete manual connect error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateChannelSchema.parse(req.body);
      const channel = await messagingChannelService.update(
        tenantId,
        req.params.id,
        body,
      );
      return res.status(200).json({
        message: "Channel updated successfully",
        channel: toPublicChannel(channel),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update channel error")
      );
    }
  };

  disconnect = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await messagingChannelService.disconnect(tenantId, req.params.id);
      return res
        .status(200)
        .json({ message: "Channel disconnected successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Disconnect channel error")
      );
    }
  };
}

export default new MessagingChannelController();
