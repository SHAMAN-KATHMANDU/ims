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

  const openRole = (roleId: string) =>
    router.push(`/${workspace}/settings/roles/${roleId}`);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles &amp; permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, their permissions, and who belongs to each.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push(`/${workspace}/settings/roles/new`)}
        >
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
          {/* Desktop (md+): table. */}
          <div className="hidden md:block">
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
                    onClick={() => openRole(role.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile (< md): stacked cards — the table's fixed-width columns
              overflowed the viewport on phones (issue #529). */}
          <div className="space-y-3 p-4 md:hidden">
            {isLoading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading roles…
              </p>
            )}
            {!isLoading && sortedRoles.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No roles yet — tap “New role” to create one.
              </p>
            )}
            {!isLoading &&
              sortedRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onClick={() => openRole(role.id)}
                />
              ))}
          </div>
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

function RoleCard({ role, onClick }: { role: Role; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`role-card-${role.id}`}
      className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: role.color ?? "#94a3b8" }}
          />
          <span className="min-w-0 break-words font-medium">{role.name}</span>
        </div>
        {role.isSystem ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Lock className="h-3 w-3" /> System
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            Custom
          </Badge>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Priority</dt>
          <dd>{role.priority}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Members</dt>
          <dd>{role.memberCount ?? 0}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Updated</dt>
          <dd className="text-muted-foreground">
            {formatDate(role.updatedAt)}
          </dd>
        </div>
      </dl>
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy HH:mm");
  } catch {
    return iso;
  }
}
