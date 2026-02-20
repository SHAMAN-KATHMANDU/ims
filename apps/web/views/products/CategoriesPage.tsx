"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { useForm } from "@/hooks/useForm";
import {
  useCategoriesPaginated,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategorySubcategories,
  useCreateSubcategory,
  useDeleteSubcategory,
  type Category,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useProduct";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import { CategoryForm } from "./components/CategoryForm";
import { CategoryTable } from "./components/CategoryTable";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { PaginationState } from "@/components/ui/data-table-pagination";
import { CategoryDeleteDialog } from "./components/dialogs/CategoryDeleteDialog";
import { SubcategoryDeleteDialog } from "./components/dialogs/SubcategoryDeleteDialog";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import type { CategoryFormValues } from "./types";

export function CategoriesPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");

  const { data: categoriesResponse, isLoading } = useCategoriesPaginated({
    page,
    limit,
    search,
    sortBy: "name",
    sortOrder: "asc",
  });

  const categories = categoriesResponse?.data ?? [];
  const pagination = categoriesResponse?.pagination;

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageProducts = isAdmin;

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [subcategoryDialog, setSubcategoryDialog] = useState(false);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{
    name: string;
    categoryName: string;
  } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title?: string;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(DEFAULT_PAGE);
  }, []);

  // Edit states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { data: selectedSubcategories = [], refetch: refetchSelectedSubs } =
    useCategorySubcategories(selectedCategory?.id || "");
  const createSubcategoryMutation = useCreateSubcategory();
  const deleteSubcategoryMutation = useDeleteSubcategory();

  // Validation functions
  const validateCategory = (values: CategoryFormValues) => {
    const errors: Record<string, string> = {};
    if (!values.name?.trim()) errors.name = "Category name is required";
    return Object.keys(errors).length > 0 ? errors : null;
  };

  // Category form
  const categoryForm = useForm<CategoryFormValues>({
    initialValues: { name: "", description: "" },
    validate: validateCategory,
    onSubmit: async (values) => {
      try {
        if (!values.name?.trim()) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "Category name is required. Please enter a category name.",
          });
          return;
        }

        if (editingCategory) {
          await updateCategoryMutation.mutateAsync({
            id: editingCategory.id,
            data: values,
          });
          toast({ title: "Category updated successfully" });
        } else {
          await createCategoryMutation.mutateAsync(values);
          toast({ title: "Category added successfully" });
        }
        setCategoryDialog(false);
        setEditingCategory(null);
        categoryForm.reset();
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to save category";
        setErrorDialog({
          open: true,
          title: "Error Saving Category",
          message: errorMessage,
        });
      }
    },
  });

  // Handlers
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.values.name = category.name;
    categoryForm.values.description = category.description || "";
    setCategoryDialog(true);
  };

  const handleResetCategory = () => {
    setEditingCategory(null);
    categoryForm.reset();
  };

  const handleOpenSubcategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setNewSubcategory("");
    refetchSelectedSubs();
    setSubcategoryDialog(true);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !newSubcategory.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subcategory name",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSubcategoryMutation.mutateAsync({
        categoryId: selectedCategory.id,
        name: newSubcategory.trim(),
      });
      toast({ title: "Subcategory created", description: newSubcategory });
      await refetchSelectedSubs();
      setNewSubcategory("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create subcategory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = (sub: string) => {
    if (!selectedCategory) return;
    setSubcategoryToDelete({
      name: sub,
      categoryName: selectedCategory.name,
    });
  };

  const handleConfirmDeleteSubcategory = async () => {
    if (!selectedCategory || !subcategoryToDelete) return;

    await deleteSubcategoryMutation.mutateAsync({
      categoryId: selectedCategory.id,
      name: subcategoryToDelete.name,
    });
    await refetchSelectedSubs();
    setSubcategoryToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground mt-2">
          Manage product categories and subcategories
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h2 className="text-xl font-semibold">All Categories</h2>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </div>
        {canManageProducts && (
          <CategoryForm
            open={categoryDialog}
            onOpenChange={setCategoryDialog}
            form={categoryForm}
            editingCategory={editingCategory}
            onReset={handleResetCategory}
          />
        )}
      </div>

      <CategoryTable
        categories={categories}
        isLoading={isLoading}
        canManageProducts={canManageProducts}
        onEdit={handleEditCategory}
        onDelete={setCategoryToDelete}
        subcategoriesByCategory={Object.fromEntries(
          categories.map((cat) => [
            cat.id,
            (cat.subCategories ?? []).map((s) => s.name),
          ]),
        )}
        onManageSubcategories={handleOpenSubcategoryDialog}
        pagination={
          pagination
            ? {
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalItems,
                itemsPerPage: pagination.itemsPerPage,
                hasNextPage: pagination.hasNextPage,
                hasPrevPage: pagination.hasPrevPage,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Subcategory Management Dialog */}
      <Dialog open={subcategoryDialog} onOpenChange={setSubcategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Manage Subcategories - {selectedCategory?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Subcategories</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCategory && selectedSubcategories.length > 0 ? (
                  selectedSubcategories.map((sub) => (
                    <Badge
                      key={sub}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSubcategory(sub)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No subcategories yet
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Add Subcategory</Label>
              <div className="flex gap-2">
                <Input
                  id="subcategory"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  placeholder="Enter subcategory name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubcategory();
                    }
                  }}
                />
                <Button onClick={handleAddSubcategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Subcategories are assigned to products. Create or edit a
                product in this category and set its subcategory field.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CategoryDeleteDialog
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onDelete={deleteCategoryMutation.mutateAsync}
      />

      <SubcategoryDeleteDialog
        subcategoryName={subcategoryToDelete?.name || null}
        categoryName={subcategoryToDelete?.categoryName || null}
        onClose={() => setSubcategoryToDelete(null)}
        onDelete={handleConfirmDeleteSubcategory}
      />

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        message={errorDialog.message}
        onGoBack={() => {}}
      />
    </div>
  );
}
