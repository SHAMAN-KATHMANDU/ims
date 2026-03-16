"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteAllNotifications,
} from "../../hooks/use-notifications";
import type { NotificationType } from "../../services/notification.service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

const DEFAULT_PAGE_SIZE = 20;

export function NotificationsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({
    page,
    limit: pageSize,
    type: typeFilter === "all" ? undefined : typeFilter,
    unreadOnly,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteAll = useDeleteAllNotifications();

  const notifications = data?.notifications ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as NotificationType | "all");
                setPage(DEFAULT_PAGE);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="TASK_DUE">Task due</SelectItem>
                <SelectItem value="DEAL_STAGE_CHANGE">
                  Deal stage change
                </SelectItem>
                <SelectItem value="LEAD_ASSIGNMENT">Lead assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="unread-only"
              checked={unreadOnly}
              onCheckedChange={(checked) => {
                setUnreadOnly(checked);
                setPage(DEFAULT_PAGE);
              }}
            />
            <Label htmlFor="unread-only" className="cursor-pointer">
              Unread only
            </Label>
          </div>
        </div>
        {(notifications.length > 0 || notifications.some((n) => !n.readAt)) && (
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.readAt) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAll.mutate()}
                disabled={deleteAll.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${
                  !n.readAt ? "bg-muted/50" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.message && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {n.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            ))}
            {pagination && (
              <DataTablePagination
                pagination={{
                  currentPage: pagination.currentPage,
                  totalPages: pagination.totalPages,
                  totalItems: pagination.totalItems,
                  itemsPerPage: pagination.itemsPerPage,
                  hasNextPage: pagination.hasNextPage,
                  hasPrevPage: pagination.hasPrevPage,
                }}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(DEFAULT_PAGE);
                }}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
