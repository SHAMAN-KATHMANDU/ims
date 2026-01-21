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
import { Edit2, Trash2, Layers } from "lucide-react";
import type { Category } from "@/hooks/useProduct";

interface CategoryTableProps {
  categories: Category[];
  canManageProducts: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  subcategoriesByCategory?: Record<string, string[]>;
  onManageSubcategories?: (category: Category) => void;
}

export function CategoryTable({
  categories,
  canManageProducts,
  onEdit,
  onDelete,
  subcategoriesByCategory = {},
  onManageSubcategories,
}: CategoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Categories</CardTitle>
        <CardDescription>Total: {categories.length}</CardDescription>
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
                    <div className="flex justify-end gap-1">
                      {onManageSubcategories && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onManageSubcategories(category)}
                          title="Manage Subcategories"
                        >
                          <Layers className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
