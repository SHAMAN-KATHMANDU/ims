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
  usePasswordResetRequests,
  useApprovePasswordReset,
  useEscalatePasswordReset,
  useRejectPasswordReset,
} from "../hooks/use-settings";
import { format } from "date-fns";
import type { PasswordResetRequest } from "@/features/users/services/user.service";

export function PasswordResetRequestsPage() {
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: PasswordResetRequest | null;
    newPassword: string;
  }>({ open: false, request: null, newPassword: "" });

  const { data: requests = [], isLoading } = usePasswordResetRequests();
  const approveMutation = useApprovePasswordReset();
  const escalateMutation = useEscalatePasswordReset();
  const rejectMutation = useRejectPasswordReset();

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
          Staff and admin forgot-password requests. Approve to set a new
          password, or escalate to platform admin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No pending password reset requests.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
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
                    <TableCell>{req.requestedBy.role}</TableCell>
                    <TableCell>
                      {format(new Date(req.createdAt), "PPp")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
                        disabled={
                          approveMutation.isPending ||
                          escalateMutation.isPending ||
                          rejectMutation.isPending
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => escalateMutation.mutate(req.id)}
                        disabled={
                          approveMutation.isPending ||
                          escalateMutation.isPending ||
                          rejectMutation.isPending
                        }
                      >
                        Escalate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={
                          approveMutation.isPending ||
                          escalateMutation.isPending ||
                          rejectMutation.isPending
                        }
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
              {approveDialog.request?.requestedBy.username}. The user will be
              able to log in with this password.
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
