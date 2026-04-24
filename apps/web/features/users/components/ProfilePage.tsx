"use client";

/**
 * Profile page — a workspace-local page every authenticated user can reach
 * from the TopBar dropdown. For now it hosts account info and the
 * self-service password change entry point; future profile fields slot in
 * as additional cards.
 */

import { useState } from "react";
import { Building2, KeyRound, User as UserIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";

import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function ProfilePage() {
  const { user, tenant } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account details and password."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
            Account
          </CardTitle>
          <CardDescription>Your workspace sign-in details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user?.username ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{user?.role ?? "—"}</span>
          </div>
          {tenant && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Workspace</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {tenant.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Password
          </CardTitle>
          <CardDescription>
            Update the password you use to sign in to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => setChangePasswordOpen(true)}
          >
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
            Change password
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
}
