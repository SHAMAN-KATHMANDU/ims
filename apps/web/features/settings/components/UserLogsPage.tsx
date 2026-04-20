"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuditLogs } from "../hooks/use-settings";
import { useUsers } from "@/features/users";
import type { AuditLogEntry } from "../services/audit.service";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export function UserLogsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: usersResult } = useUsers({ page: 1, limit: 10 });
  const users = usersResult?.users ?? [];

  const { data, isLoading } = useAuditLogs({
    page,
    limit: pageSize,
    action: actionFilter === "ALL" ? undefined : actionFilter,
    userId: userFilter === "ALL" ? undefined : userFilter,
    from: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
    to: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
  });

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(DEFAULT_PAGE);
  };

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Logs</h1>
        <p className="text-muted-foreground mt-2">
          Audit log – when users logged in and what they did
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="user-logs-user-filter" className="text-xs">
                User
              </Label>
              <Select
                value={userFilter}
                onValueChange={(v) => {
                  setUserFilter(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger
                  id="user-logs-user-filter"
                  className="w-[160px] h-8"
                  aria-label="Filter audit log by user"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="user-logs-action-filter" className="text-xs">
                Action
              </Label>
              <Select
                value={actionFilter}
                onValueChange={(v) => {
                  setActionFilter(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger
                  id="user-logs-action-filter"
                  className="w-[180px] h-8"
                  aria-label="Filter audit log by action"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                  <SelectItem value="CREATE_SALE">CREATE_SALE</SelectItem>
                  <SelectItem value="CREATE_TRANSFER">
                    CREATE_TRANSFER
                  </SelectItem>
                  <SelectItem value="CREATE_PRODUCT">CREATE_PRODUCT</SelectItem>
                  <SelectItem value="UPDATE_PRODUCT">UPDATE_PRODUCT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={
                      dateFrom
                        ? `From date: ${format(dateFrom, "PP")}. Change`
                        : "Select from date"
                    }
                    className={cn(
                      "h-8 w-[140px] justify-start text-left font-normal text-sm",
                      !dateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon
                      className="mr-2 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {dateFrom ? format(dateFrom, "MMM d") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      setPage(DEFAULT_PAGE);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={
                      dateTo
                        ? `To date: ${format(dateTo, "PP")}. Change`
                        : "Select to date"
                    }
                    className={cn(
                      "h-8 w-[140px] justify-start text-left font-normal text-sm",
                      !dateTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon
                      className="mr-2 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {dateTo ? format(dateTo, "MMM d") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      setPage(DEFAULT_PAGE);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={clearDateFilters}
                >
                  <X className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                  Clear dates
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div role="status" aria-live="polite">
              <Skeleton className="h-64 w-full" />
              <span className="sr-only">Loading audit log…</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log: AuditLogEntry) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(
                              new Date(log.createdAt),
                              "MMM d, yyyy HH:mm:ss",
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {log.user?.username ?? log.userId}
                            </span>
                            {log.user?.role && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({log.user.role})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.resource && (
                              <span className="text-sm">
                                {log.resource}
                                {log.resourceId &&
                                  ` #${log.resourceId.slice(0, 8)}`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {log.details &&
                              typeof log.details === "object" &&
                              JSON.stringify(log.details)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && pagination.totalPages > 0 && (
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
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
