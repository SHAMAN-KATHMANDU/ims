"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Building2, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tenant } from "../../hooks/use-tenants";

interface TenantTableProps {
  tenants: Tenant[];
  isLoading?: boolean;
  basePath: string;
  onDeactivate?: (tenant: Tenant) => void;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  LOCKED: "outline",
  CANCELLED: "outline",
};

export function TenantTable({
  tenants,
  isLoading,
  basePath,
  onDeactivate,
}: TenantTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No tenants yet</h3>
        <p className="text-muted-foreground mt-2">
          Onboard your first organization to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Products</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
              <TableCell>
                <Badge variant="outline">{tenant.plan}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    STATUS_VARIANT[tenant.subscriptionStatus] ?? "secondary"
                  }
                >
                  {tenant.subscriptionStatus}
                </Badge>
              </TableCell>
              <TableCell>{tenant._count?.users ?? "—"}</TableCell>
              <TableCell>{tenant._count?.products ?? "—"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`${basePath}/platform/tenants/${tenant.id}/edit`}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    {tenant.isActive && onDeactivate && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeactivate(tenant)}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
