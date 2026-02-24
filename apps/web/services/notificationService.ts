import api from "@/lib/axios";

export type NotificationType =
  | "TASK_DUE"
  | "DEAL_STAGE_CHANGE"
  | "LEAD_ASSIGNMENT";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export async function getNotifications(params?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ notifications: Notification[] }> {
  const res = await api.get<{ data?: { notifications: Notification[] } }>(
    "/notifications",
    { params },
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await api.get<{ data?: { count: number } }>(
    "/notifications/unread-count",
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
