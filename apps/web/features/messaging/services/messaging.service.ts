import api from "@/lib/axios";

// === Interfaces ===

export interface Conversation {
  id: string;
  channelId: string;
  participantId: string;
  participantName: string | null;
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
  sentBy?: { id: string; username: string } | null;
}

export interface SendMessageData {
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
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

export async function sendMessage(
  conversationId: string,
  data: SendMessageData,
) {
  const res = await api.post(
    `/messaging/conversations/${conversationId}/messages`,
    data,
  );
  return res.data;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await api.post(`/messaging/conversations/${conversationId}/mark-read`);
}
