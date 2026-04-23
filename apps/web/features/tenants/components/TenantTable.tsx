"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Building2, MoreHorizontal, Pencil, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type SortOrder } from "@/components/ui/table";
import type { Tenant } from "../hooks/use-tenants";

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
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const handleSort = useCallback((key: string, order: SortOrder) => {
    if (order === "none") {
      setSortBy("");
      setSortOrder("none");
      return;
    }
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const displayTenants = useMemo(() => {
    if (sortOrder === "none" || !sortBy) return tenants;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...tenants].sort((a, b) => {
      if (sortBy === "name") {
        return (
          dir * a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      }
      if (sortBy === "plan") {
        return dir * String(a.plan).localeCompare(String(b.plan));
      }
      if (sortBy === "subscriptionStatus") {
        return dir * a.subscriptionStatus.localeCompare(b.subscriptionStatus);
      }
      return 0;
    });
  }, [tenants, sortBy, sortOrder]);

  const columns: DataTableColumn<Tenant>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cellClassName: "font-medium",
      cell: (t) => t.name,
    },
    {
      id: "slug",
      header: "Slug",
      cellClassName: "font-mono text-sm",
      cell: (t) => t.slug,
    },
    {
      id: "plan",
      header: "Plan",
      sortKey: "plan",
      cell: (t) => <Badge variant="outline">{t.plan}</Badge>,
    },
    {
      id: "subscriptionStatus",
      header: "Status",
      sortKey: "subscriptionStatus",
      cell: (t) => (
        <Badge variant={STATUS_VARIANT[t.subscriptionStatus] ?? "secondary"}>
          {t.subscriptionStatus}
        </Badge>
      ),
    },
    {
      id: "users",
      header: "Users",
      cell: (t) => t._count?.users ?? "—",
    },
    {
      id: "products",
      header: "Products",
      cell: (t) => t._count?.products ?? "—",
    },
  ];

  return (
    <DataTable<Tenant>
      data={displayTenants}
      columns={columns}
      getRowKey={(t) => t.id}
      isLoading={isLoading}
      skeletonRows={3}
      sort={{ sortBy, sortOrder, onSort: handleSort }}
      emptyState={{
        title: "No tenants yet",
        description: (
          <>
            <Building2
              className="mx-auto mb-2 h-12 w-12 text-muted-foreground"
              aria-hidden="true"
            />
            Onboard your first organization to get started.
          </>
        ),
      }}
      actions={(t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Actions for {t.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/platform/tenants/${t.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            </DropdownMenuItem>
            {t.isActive && onDeactivate && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeactivate(t)}
              >
                <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
