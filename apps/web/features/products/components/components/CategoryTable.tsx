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
import { Checkbox } from "@/components/ui/checkbox";
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
  /** When provided, shows checkbox column and selection UI */
  selectedCategories?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** When set, the matching category row is highlighted (e.g. on duplicate error). */
  highlightCategoryId?: string | null;
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
  selectedCategories = new Set(),
  onSelectionChange,
  highlightCategoryId,
}: CategoryTableProps) {
  const allSelected =
    categories.length > 0 &&
    categories.every((c) => selectedCategories.has(c.id));
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) onSelectionChange(new Set(categories.map((c) => c.id)));
    else onSelectionChange(new Set());
  };
  const handleSelectOne = (categoryId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedCategories);
    if (checked) next.add(categoryId);
    else next.delete(categoryId);
    onSelectionChange(next);
  };

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
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all categories"
                  />
                </TableHead>
              )}
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
              <TableRow
                key={category.id}
                id={`category-row-${category.id}`}
                data-category-id={category.id}
                className={
                  highlightCategoryId === category.id
                    ? "bg-amber-100 dark:bg-amber-950/50 animate-pulse"
                    : undefined
                }
              >
                {onSelectionChange && (
                  <TableCell
                    className="w-12"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(category.id, checked === true)
                      }
                      aria-label={`Select ${category.name}`}
                    />
                  </TableCell>
                )}
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
