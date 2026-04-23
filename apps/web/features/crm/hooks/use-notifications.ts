"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllNotifications,
  type NotificationType,
} from "../services/notification.service";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  }) => [...notificationKeys.all, "list", params] as const,
  unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

export function useNotifications(
  params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  },
  options?: { enabled?: boolean },
) {
  const notificationsEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications(params),
    enabled: notificationsEnabled && (options?.enabled ?? true),
    refetchInterval: () => {
      if (typeof document === "undefined") return false;
      if (document.visibilityState !== "visible") return false;
      return 2 * 60 * 1000;
    },
    refetchIntervalInBackground: false,
  });
}

export function useUnreadNotificationCount(options?: { enabled?: boolean }) {
  const notificationsEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getUnreadCount(),
    enabled: notificationsEnabled && (options?.enabled ?? true),
    refetchInterval: () => {
      if (typeof document === "undefined") return false;
      if (document.visibilityState !== "visible") return false;
      return 2 * 60 * 1000;
    },
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const notificationsEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!notificationsEnabled)
        throw new Error("Feature disabled: SALES_PIPELINE");
      return markNotificationRead(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const notificationsEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!notificationsEnabled)
        throw new Error("Feature disabled: SALES_PIPELINE");
      return markAllNotificationsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteAllNotifications() {
  const notificationsEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!notificationsEnabled)
        throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteAllNotifications();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
