"use client";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Trash2, Layers, MoreHorizontal } from "lucide-react";
import type { Category } from "@/hooks/useProduct";

interface CategoryTableProps {
  categories: Category[];
  isLoading?: boolean;
  canManageProducts: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  subcategoriesByCategory?: Record<string, string[]>;
  onManageSubcategories?: (category: Category) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function CategoryTable({
  categories,
  isLoading,
  canManageProducts,
  onEdit,
  onDelete,
  subcategoriesByCategory = {},
  onManageSubcategories,
  pagination,
  onPageChange,
  onPageSizeChange,
}: CategoryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-24" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>No categories found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Get started by creating a category.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Categories</CardTitle>
        <CardDescription>
          Total: {pagination?.totalItems ?? categories.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Subcategories</TableHead>
              {canManageProducts && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {category.description || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {subcategoriesByCategory[category.id] &&
                  subcategoriesByCategory[category.id]!.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {subcategoriesByCategory[category.id]!.map((sub) => (
                        <span
                          key={sub}
                          className="px-2 py-0.5 rounded-full bg-muted text-xs"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </TableCell>
                {canManageProducts && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onManageSubcategories && (
                          <DropdownMenuItem
                            onClick={() => onManageSubcategories(category)}
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            Manage subcategories
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(category)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination && onPageChange && (
          <DataTablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}
