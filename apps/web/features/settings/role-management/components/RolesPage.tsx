"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate, useRoles, type Role } from "@/features/permissions";

/**
 * Roles list for the tenant. Drag-and-drop priority reorder is tracked as a
 * follow-up (needs the backend `PATCH /roles/reorder` endpoint from
 * ui-perm-core / rbac-api) — for now we show priority in the column and use
 * the RoleEditor to adjust it.
 */
export function RolesPage() {
  return (
    <PermissionGate perm="SETTINGS.ROLES.MANAGE">
      <RolesPageInner />
    </PermissionGate>
  );
}

function RolesPageInner() {
  const router = useRouter();
  const params = useParams();
  const workspace = String(params.workspace ?? "");

  const { data, isLoading } = useRoles({ page: 1, limit: 100 });

  const sortedRoles = useMemo(() => {
    const roles = [...(data?.roles ?? [])];
    roles.sort((a, b) => b.priority - a.priority);
    return roles;
  }, [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles &amp; permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, their permissions, and who belongs to each.
          </p>
        </div>
        <Button onClick={() => router.push(`/${workspace}/settings/roles/new`)}>
          <Plus className="mr-2 h-4 w-4" /> New role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All roles</CardTitle>
          <CardDescription>
            Higher-priority roles override lower ones when a user holds both.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead className="w-28">Members</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-44">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading roles…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedRoles.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No roles yet — click “New role” to create one.
                  </TableCell>
                </TableRow>
              )}
              {sortedRoles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onClick={() =>
                    router.push(`/${workspace}/settings/roles/${role.id}`)
                  }
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleRow({ role, onClick }: { role: Role; onClick: () => void }) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
      data-testid={`role-row-${role.id}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: role.color ?? "#94a3b8" }}
          />
          <span>{role.name}</span>
        </div>
      </TableCell>
      <TableCell>{role.priority}</TableCell>
      <TableCell>{role.memberCount ?? 0}</TableCell>
      <TableCell>
        {role.isSystem ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" /> System
          </Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(role.updatedAt)}
      </TableCell>
    </TableRow>
  );
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy HH:mm");
  } catch {
    return iso;
  }
}
