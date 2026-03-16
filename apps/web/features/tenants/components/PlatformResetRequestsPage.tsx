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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePlatformResetRequests,
  useApprovePlatformResetRequest,
  type PlatformPasswordResetRequest,
} from "../hooks/use-tenants";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import { format } from "date-fns";
import { Search } from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;

export function PlatformResetRequestsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: PlatformPasswordResetRequest | null;
    newPassword: string;
  }>({ open: false, request: null, newPassword: "" });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = usePlatformResetRequests({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
  });
  const requests = data?.requests ?? [];
  const pagination = data?.pagination;
  const approveMutation = useApprovePlatformResetRequest();

  const handleApprove = () => {
    if (!approveDialog.request || !approveDialog.newPassword.trim()) return;
    if (approveDialog.newPassword.length < 8) return;
    approveMutation.mutate(
      {
        requestId: approveDialog.request.id,
        newPassword: approveDialog.newPassword,
      },
      {
        onSuccess: () => {
          setApproveDialog({ open: false, request: null, newPassword: "" });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Password Reset Requests</h1>
        <p className="text-muted-foreground mt-2">
          Escalated requests from tenant superadmins. Approve to set a new
          password for the user.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <CardTitle className="sr-only">Escalated Requests</CardTitle>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or tenant..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(DEFAULT_PAGE);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No escalated password reset requests.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.requestedBy.username}
                    </TableCell>
                    <TableCell>{req.tenant.name}</TableCell>
                    <TableCell>{req.requestedBy.role}</TableCell>
                    <TableCell>
                      {format(new Date(req.createdAt), "PPp")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          setApproveDialog({
                            open: true,
                            request: req,
                            newPassword: "",
                          })
                        }
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) =>
          !open &&
          setApproveDialog({ open: false, request: null, newPassword: "" })
        }
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Enter a new password for{" "}
              {approveDialog.request?.requestedBy.username} (
              {approveDialog.request?.tenant.name}). The user will be able to
              log in with this password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={approveDialog.newPassword}
                onChange={(e) =>
                  setApproveDialog((p) => ({
                    ...p,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="Min 8 characters"
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setApproveDialog({
                  open: false,
                  request: null,
                  newPassword: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                !approveDialog.newPassword ||
                approveDialog.newPassword.length < 8 ||
                approveMutation.isPending
              }
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
