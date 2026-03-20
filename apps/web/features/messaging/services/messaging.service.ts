import api, { API_BASE_URL } from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

/** Turn relative /uploads/... URLs into absolute API host URLs for <img> / <video>. */
export function resolveMessagingAssetUrl(url: string): string {
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    return origin ? `${origin}${url}` : url;
  }
  return url;
}

// === Interfaces ===

export interface MessagingChannel {
  id: string;
  tenantId: string;
  provider: "FACEBOOK_MESSENGER";
  name: string;
  status: "PENDING" | "ACTIVE" | "DISCONNECTED" | "ERROR";
  externalId: string | null;
  webhookVerifyToken: string | null;
  metadata: Record<string, unknown> | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { conversations: number };
}

export interface RegisterManualWebhookVerifyPayload {
  provider: "FACEBOOK_MESSENGER";
  webhookVerifyToken: string;
}

export interface CompleteManualConnectPayload {
  pageId: string;
  pageAccessToken: string;
  pageName: string;
}

export interface Conversation {
  id: string;
  channelId: string;
  participantId: string;
  participantName: string | null;
  participantProfilePictureUrl?: string | null;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  assignedToId: string | null;
  contactId: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unreadCount: number;
  createdAt: string;
  channel: { id: string; name: string; provider: string };
  contact?: { id: string; firstName: string; lastName: string | null } | null;
  assignedTo?: { id: string; username: string } | null;
}

export interface ConversationListParams {
  status?: "OPEN" | "CLOSED" | "ARCHIVED";
  channelId?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; username: string };
}

export interface MessageReplySnippet {
  id: string;
  textContent: string | null;
  direction: string;
  contentType: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  contentType: string;
  textContent: string | null;
  mediaPayload: unknown;
  providerMessageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: MessageReplySnippet | null;
  reactions?: MessageReaction[];
  sentById?: string | null;
  sentBy?: { id: string; username: string } | null;
}

export interface SendMessageData {
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  replyToId?: string;
}

export interface MessagingMediaUploadResult {
  message: string;
  url: string;
  mediaType: "image" | "video";
  relativeUrl: string;
}

export interface UpdateConversationData {
  assignedToId?: string | null;
  contactId?: string | null;
  status?: "OPEN" | "CLOSED" | "ARCHIVED";
}

// === API Functions ===

export async function getConversations(
  params: ConversationListParams = {},
): Promise<ConversationListResponse> {
  const res = await api.get("/messaging/conversations", { params });
  return res.data;
}

export async function getConversation(id: string) {
  const res = await api.get(`/messaging/conversations/${id}`);
  return res.data;
}

export async function updateConversation(
  id: string,
  data: UpdateConversationData,
) {
  const res = await api.put(`/messaging/conversations/${id}`, data);
  return res.data;
}

export async function getMessages(
  conversationId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<{ messages: Message[] }> {
  const res = await api.get(
    `/messaging/conversations/${conversationId}/messages`,
    { params },
  );
  return res.data;
}

export interface SendMessageResponse {
  message: string;
  data: Message;
}

export async function sendMessage(
  conversationId: string,
  data: SendMessageData,
): Promise<SendMessageResponse> {
  const res = await api.post<SendMessageResponse>(
    `/messaging/conversations/${conversationId}/messages`,
    data,
  );
  return res.data;
}

export async function uploadMessagingMedia(
  conversationId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MessagingMediaUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<MessagingMediaUploadResult>(
    `/messaging/conversations/${conversationId}/upload`,
    form,
    {
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    },
  );
  return res.data;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await api.post(`/messaging/conversations/${conversationId}/mark-read`);
}

export async function addMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<MessageReaction> {
  const res = await api.post<{
    message: string;
    reaction: MessageReaction;
  }>(
    `/messaging/conversations/${conversationId}/messages/${messageId}/reactions`,
    { emoji },
  );
  return res.data.reaction;
}

export async function removeMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  const encoded = encodeURIComponent(emoji);
  await api.delete(
    `/messaging/conversations/${conversationId}/messages/${messageId}/reactions/${encoded}`,
  );
}

export async function editConversationMessage(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<Message> {
  const res = await api.put<{ message: string; data: Message }>(
    `/messaging/conversations/${conversationId}/messages/${messageId}`,
    { text },
  );
  return res.data.data;
}

export async function getMessagingChannels(): Promise<MessagingChannel[]> {
  try {
    const res = await api.get<{ message: string; channels: MessagingChannel[] }>(
      "/messaging-channels",
    );
    return res.data.channels ?? [];
  } catch (error) {
    throw handleApiError(error, "getMessagingChannels");
  }
}

export async function registerManualWebhookVerify(
  payload: RegisterManualWebhookVerifyPayload,
): Promise<MessagingChannel> {
  try {
    const res = await api.post<{
      message: string;
      channel: MessagingChannel;
    }>("/messaging-channels/manual-connect/webhook-verify", payload);
    return res.data.channel;
  } catch (error) {
    throw handleApiError(error, "registerManualWebhookVerify");
  }
}

export async function completeManualMessagingChannel(
  channelId: string,
  payload: CompleteManualConnectPayload,
): Promise<MessagingChannel> {
  try {
    const res = await api.post<{
      message: string;
      channel: MessagingChannel;
    }>(`/messaging-channels/manual-connect/${channelId}/complete`, payload);
    return res.data.channel;
  } catch (error) {
    throw handleApiError(error, "completeManualMessagingChannel");
  }
}
