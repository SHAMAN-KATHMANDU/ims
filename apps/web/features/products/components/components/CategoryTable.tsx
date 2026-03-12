"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Edit2, RotateCcw, Trash2, Layers, MoreHorizontal } from "lucide-react";
import type { Category } from "@/features/products";

interface CategoryTableProps {
  categories: Category[];
  canManageProducts: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onRestore?: (category: Category) => void;
  isRestoring?: boolean;
  subcategoriesByCategory?: Record<string, string[]>;
  onManageSubcategories?: (category: Category) => void;
  totalItems?: number;
}

export function CategoryTable({
  categories,
  canManageProducts,
  onEdit,
  onDelete,
  onRestore,
  isRestoring = false,
  subcategoriesByCategory = {},
  onManageSubcategories,
  totalItems,
}: CategoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Categories</CardTitle>
        <CardDescription>
          Total: {totalItems ?? categories.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Subcategories</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell>
                  {category.deletedAt ? (
                    <Badge variant="secondary">Deactivated</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-600">
                      Active
                    </Badge>
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
                        {category.deletedAt ? (
                          onRestore && (
                            <DropdownMenuItem
                              onClick={() => onRestore(category)}
                              disabled={isRestoring}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )
                        ) : (
                          <>
                            {onManageSubcategories && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onManageSubcategories(category)
                                }
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
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
