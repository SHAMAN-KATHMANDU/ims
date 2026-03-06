import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  SendMessageSchema,
  UpdateConversationSchema,
  ConversationQuerySchema,
  MessageQuerySchema,
} from "./messaging.schema";
import messagingService from "./messaging.service";
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

class MessagingController {
  getConversations = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = ConversationQuerySchema.parse(req.query);
      const result = await messagingService.getConversations(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get conversations error");
    }
  };

  getConversation = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const conversation = await messagingService.getConversation(
        tenantId,
        req.params.id,
      );
      return res.status(200).json({ message: "OK", conversation });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get conversation error")
      );
    }
  };

  updateConversation = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateConversationSchema.parse(req.body);
      const conversation = await messagingService.updateConversation(
        tenantId,
        req.params.id,
        body,
      );
      return res
        .status(200)
        .json({ message: "Conversation updated", conversation });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update conversation error")
      );
    }
  };

  getMessages = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = MessageQuerySchema.parse(req.query);
      const messages = await messagingService.getMessages(
        tenantId,
        req.params.id,
        query,
      );
      return res.status(200).json({ message: "OK", messages });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get messages error")
      );
    }
  };

  sendMessage = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = SendMessageSchema.parse(req.body);
      const message = await messagingService.sendMessage(
        tenantId,
        req.params.id,
        userId,
        body,
      );
      return res
        .status(201)
        .json({ message: "Message queued for delivery", data: message });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Send message error")
      );
    }
  };

  markRead = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await messagingService.markRead(tenantId, req.params.id);
      return res.status(200).json({ message: "Conversation marked as read" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Mark read error")
      );
    }
  };
}

export default new MessagingController();
