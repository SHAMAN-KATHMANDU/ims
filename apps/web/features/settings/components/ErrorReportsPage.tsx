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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import {
  useErrorReports,
  useUpdateErrorReportStatus,
} from "../hooks/use-settings";
import { useUsers } from "@/features/users";
import { useAuthStore, selectUserRole } from "@/store/auth-store";
import type {
  ErrorReport,
  ErrorReportStatus,
} from "../services/error-report.service";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export function ErrorReportsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: usersResult } = useUsers({ page: 1, limit: 100 });
  const users = usersResult?.users ?? [];

  const { data, isLoading } = useErrorReports({
    page,
    limit: pageSize,
    status:
      statusFilter === "ALL" ? undefined : (statusFilter as ErrorReportStatus),
    userId: userFilter === "ALL" ? undefined : userFilter,
    from: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
    to: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
  });

  const updateStatusMutation = useUpdateErrorReportStatus();
  const userRole = useAuthStore(selectUserRole);
  const canChangeStatus = userRole === "platformAdmin";

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(DEFAULT_PAGE);
  };

  const reports = data?.data ?? [];
  const pagination = data?.pagination;

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "destructive";
      case "REVIEWED":
        return "secondary";
      case "RESOLVED":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Error Reports</h1>
        <p className="text-muted-foreground mt-2">
          Reports submitted by users from the top bar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">User</Label>
              <Select
                value={userFilter}
                onValueChange={(v) => {
                  setUserFilter(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-[160px] h-8">
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
              <Label className="text-xs">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="REVIEWED">REVIEWED</SelectItem>
                  <SelectItem value="RESOLVED">RESOLVED</SelectItem>
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
                    className={cn(
                      "h-8 w-[140px] justify-start text-left font-normal text-sm",
                      !dateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
                    className={cn(
                      "h-8 w-[140px] justify-start text-left font-normal text-sm",
                      !dateTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
                  <X className="h-3.5 w-3.5 mr-2" />
                  Clear dates
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="max-w-[200px]">
                        Description
                      </TableHead>
                      <TableHead className="max-w-[180px]">Page URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No error reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report: ErrorReport) => (
                        <TableRow key={report.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(
                              new Date(report.createdAt),
                              "MMM d, yyyy HH:mm",
                            )}
                          </TableCell>
                          <TableCell>
                            {report.user?.username ?? report.userId}
                          </TableCell>
                          <TableCell className="font-medium">
                            {report.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {report.description ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">
                            {report.pageUrl ? (
                              <a
                                href={report.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {report.pageUrl}
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {canChangeStatus ? (
                              <Select
                                value={report.status}
                                onValueChange={(value) =>
                                  updateStatusMutation.mutate({
                                    id: report.id,
                                    status: value as ErrorReportStatus,
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OPEN">OPEN</SelectItem>
                                  <SelectItem value="REVIEWED">
                                    REVIEWED
                                  </SelectItem>
                                  <SelectItem value="RESOLVED">
                                    RESOLVED
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
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
