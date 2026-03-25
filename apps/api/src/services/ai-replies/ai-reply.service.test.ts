import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addQueueJob: vi.fn(),
  repoMock: {
    hasProcessedInboundMessage: vi.fn(),
    findInboundMessageForReply: vi.fn(),
    markProcessed: vi.fn(),
    hasRecentAutoReply: vi.fn(),
    listRecentMessages: vi.fn(),
    createPendingOutboundMessage: vi.fn(),
  },
  generateReply: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  env: {
    aiReplyApiKey: "test-key",
    aiReplyEnabledDefault: true,
    aiReplyModel: "gemini-2.0-flash",
    aiReplyProvider: "GEMINI_API",
    aiReplyBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
}));

vi.mock("@/queues/queue.config", () => ({
  outboundQueue: { add: mocks.addQueueJob },
}));

vi.mock("@/providers/llm/provider-factory", () => ({
  getLlmProvider: () => ({
    providerName: "GEMINI_API",
    generateReply: mocks.generateReply,
  }),
}));

vi.mock("./ai-reply.repository", () => ({
  default: mocks.repoMock,
}));

import aiReplyService from "./ai-reply.service";

describe("AiReplyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks unsupported content types as processed", async () => {
    mocks.repoMock.hasProcessedInboundMessage.mockResolvedValue(false);
    mocks.repoMock.findInboundMessageForReply.mockResolvedValue({
      id: "m-in-1",
      textContent: null,
      contentType: "IMAGE",
      conversation: {
        id: "c-1",
        tenantId: "t-1",
        channelId: "ch-1",
        participantId: "p-1",
        channel: { id: "ch-1", metadata: { aiAutoReplyEnabled: true } },
      },
    });

    await aiReplyService.processInboundMessage({
      tenantId: "t-1",
      conversationId: "c-1",
      inboundMessageId: "m-in-1",
      providerEventId: "evt-1",
    });

    expect(mocks.repoMock.markProcessed).toHaveBeenCalledWith("m-in-1", {
      reason: "unsupported_content_type",
    });
    expect(mocks.addQueueJob).not.toHaveBeenCalled();
  });

  it("creates outbound queued auto reply for eligible text", async () => {
    mocks.repoMock.hasProcessedInboundMessage.mockResolvedValue(false);
    mocks.repoMock.findInboundMessageForReply.mockResolvedValue({
      id: "m-in-2",
      textContent: "Hello there",
      contentType: "TEXT",
      conversation: {
        id: "c-1",
        tenantId: "t-1",
        channelId: "ch-1",
        participantId: "p-1",
        channel: { id: "ch-1", metadata: { aiAutoReplyEnabled: true } },
      },
    });
    mocks.repoMock.hasRecentAutoReply.mockResolvedValue(false);
    mocks.repoMock.listRecentMessages.mockResolvedValue([
      {
        id: "m-old-1",
        direction: "INBOUND",
        contentType: "TEXT",
        textContent: "Do you have this in stock?",
      },
    ]);
    mocks.generateReply.mockResolvedValue({ text: "Yes, it is available." });
    mocks.repoMock.createPendingOutboundMessage.mockResolvedValue({
      id: "m-out-1",
    });

    await aiReplyService.processInboundMessage({
      tenantId: "t-1",
      conversationId: "c-1",
      inboundMessageId: "m-in-2",
      providerEventId: "evt-2",
    });

    expect(mocks.repoMock.createPendingOutboundMessage).toHaveBeenCalledWith({
      conversationId: "c-1",
      sourceInboundMessageId: "m-in-2",
      text: "Yes, it is available.",
    });
    expect(mocks.addQueueJob).toHaveBeenCalledWith("outbound", {
      messageId: "m-out-1",
      conversationId: "c-1",
      channelId: "ch-1",
    });
  });
});
