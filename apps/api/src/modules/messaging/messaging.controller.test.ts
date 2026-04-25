import { describe, it, expect, vi, beforeEach } from "vitest";
import { Response } from "express";

vi.mock("./messaging.service", () => ({
  default: {
    getConversations: vi.fn(),
    getConversation: vi.fn(),
    updateConversation: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markRead: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    editMessage: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import messagingController from "./messaging.controller";
import * as messagingServiceModule from "./messaging.service";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = messagingServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function makeAppError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

describe("MessagingController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addReaction", () => {
    it("returns 201 with reaction on success", async () => {
      const reaction = {
        id: "r1",
        messageId: "m1",
        userId: "u1",
        emoji: "👍",
        user: { id: "u1", username: "alice" },
      };
      mockService.addReaction.mockResolvedValue(reaction);
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { emoji: "👍" },
      });
      const res = mockRes() as Response;

      await messagingController.addReaction(req, res);

      expect(mockService.addReaction).toHaveBeenCalledWith(
        "t1",
        "c1",
        "m1",
        "u1",
        "👍",
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Reaction added",
        reaction,
      });
    });

    it("returns 400 when emoji missing (Zod)", async () => {
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: {},
      });
      const res = mockRes() as Response;

      await messagingController.addReaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.addReaction).not.toHaveBeenCalled();
    });

    it("returns 404 when service throws not found", async () => {
      mockService.addReaction.mockRejectedValue(
        makeAppError("Message not found", 404),
      );
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { emoji: "👍" },
      });
      const res = mockRes() as Response;

      await messagingController.addReaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.addReaction.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { emoji: "👍" },
      });
      const res = mockRes() as Response;

      await messagingController.addReaction(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("removeReaction", () => {
    it("returns 200 on success", async () => {
      mockService.removeReaction.mockResolvedValue({ ok: true });
      const encoded = encodeURIComponent("👍");
      const req = makeReq({
        params: { id: "c1", messageId: "m1", emoji: encoded },
      });
      const res = mockRes() as Response;

      await messagingController.removeReaction(req, res);

      expect(mockService.removeReaction).toHaveBeenCalledWith(
        "t1",
        "c1",
        "m1",
        "u1",
        "👍",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when reaction not found", async () => {
      mockService.removeReaction.mockRejectedValue(
        makeAppError("Reaction not found", 404),
      );
      const req = makeReq({
        params: {
          id: "c1",
          messageId: "m1",
          emoji: encodeURIComponent("👍"),
        },
      });
      const res = mockRes() as Response;

      await messagingController.removeReaction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("editMessage", () => {
    it("returns 200 with updated message", async () => {
      const message = {
        id: "m1",
        textContent: "new text",
        editedAt: new Date("2026-01-01"),
      };
      mockService.editMessage.mockResolvedValue(message);
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { text: "new text" },
      });
      const res = mockRes() as Response;

      await messagingController.editMessage(req, res);

      expect(mockService.editMessage).toHaveBeenCalledWith(
        "t1",
        "c1",
        "m1",
        "u1",
        "new text",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Message updated",
        data: message,
      });
    });

    it("returns 400 when text invalid", async () => {
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { text: "   " },
      });
      const res = mockRes() as Response;

      await messagingController.editMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when not allowed", async () => {
      mockService.editMessage.mockRejectedValue(
        makeAppError("You can only edit your own outbound messages", 403),
      );
      const req = makeReq({
        params: { id: "c1", messageId: "m1" },
        body: { text: "x" },
      });
      const res = mockRes() as Response;

      await messagingController.editMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
