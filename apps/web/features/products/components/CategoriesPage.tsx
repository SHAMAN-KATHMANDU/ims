"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import {
  useCategoriesPaginated,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useRestoreCategory,
  useCategorySubcategories,
  useCreateSubcategory,
  useDeleteSubcategory,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type Category,
  type CategoryListParams,
  type CategoryStatusFilter,
} from "@/features/products";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import { useDebounce } from "@/hooks/useDebounce";
import { CategoryForm } from "./components/CategoryForm";
import { CategoryTable } from "./components/CategoryTable";
import { CategoryDeleteDialog } from "./components/dialogs/CategoryDeleteDialog";
import { SubcategoryDeleteDialog } from "./components/dialogs/SubcategoryDeleteDialog";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, X } from "lucide-react";
import type { CategoryFormInput } from "../validation";
import {
  useCategorySelectionStore,
  selectSelectedCategoryIds,
  selectClearSelection,
  selectSetCategories,
} from "@/store/category-selection-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CategoriesPage() {
  const [listParams, setListParams] = useState<CategoryListParams>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: "",
    status: "all",
  });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: categoriesResponse, isFetching } = useCategoriesPaginated({
    ...listParams,
    search: debouncedSearch,
  });
  const categories = categoriesResponse?.data ?? [];
  const pagination = categoriesResponse?.pagination ?? {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: DEFAULT_LIMIT,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const restoreCategoryMutation = useRestoreCategory();
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageProducts = isAdmin;

  const handlePageChange = useCallback((page: number) => {
    setListParams((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setListParams((prev) => ({ ...prev, page: DEFAULT_PAGE, limit }));
  }, []);

  const handleStatusChange = useCallback((status: CategoryStatusFilter) => {
    setListParams((prev) => ({ ...prev, page: DEFAULT_PAGE, status }));
  }, []);

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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [highlightCategoryId, setHighlightCategoryId] = useState<string | null>(
    null,
  );

  const selectedCategoryIds = useCategorySelectionStore(
    selectSelectedCategoryIds,
  );
  const setSelectedCategoryIds = useCategorySelectionStore(selectSetCategories);
  const clearSelection = useCategorySelectionStore(selectClearSelection);

  // Edit states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { data: selectedSubcategories = [], refetch: refetchSelectedSubs } =
    useCategorySubcategories(selectedCategory?.id || "");
  const createSubcategoryMutation = useCreateSubcategory();
  const deleteSubcategoryMutation = useDeleteSubcategory();

  const handleCategorySubmit = async (values: CategoryFormInput) => {
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: { name: values.name, description: values.description },
        });
        toast({ title: "Category updated successfully" });
      } else {
        const result = await createCategoryMutation.mutateAsync({
          name: values.name,
          description: values.description,
        });
        const { category, restored } = result;
        if (category.id && values.subcategories?.length) {
          for (const name of values.subcategories) {
            if (name?.trim()) {
              await createSubcategoryMutation.mutateAsync({
                categoryId: category.id,
                name: name.trim(),
              });
            }
          }
        }
        toast({
          title: restored
            ? "Category restored successfully"
            : "Category added successfully",
        });
      }
      setCategoryDialog(false);
      setEditingCategory(null);
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        existingCategory?: { id: string; name: string };
      };
      const errorMessage =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ??
        err.message ??
        "Failed to save category";
      setErrorDialog({
        open: true,
        title: "Error Saving Category",
        message: errorMessage,
      });
      if (err.existingCategory?.id) {
        setHighlightCategoryId(err.existingCategory.id);
        setSearchInput(err.existingCategory.name);
        setListParams((prev) => ({ ...prev, page: DEFAULT_PAGE }));
      }
    }
  };

  // Scroll to and highlight the category row when it appears after a 409
  const isHighlightVisible =
    !!highlightCategoryId &&
    categories.some((c) => c.id === highlightCategoryId);
  useEffect(() => {
    if (!highlightCategoryId || !isHighlightVisible) return;
    const el = document.getElementById(`category-row-${highlightCategoryId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = setTimeout(() => setHighlightCategoryId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightCategoryId, isHighlightVisible]);

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialog(true);
  };

  const handleResetCategory = () => {
    setEditingCategory(null);
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

  const handleConfirmDeleteSubcategory = async (reason?: string) => {
    if (!selectedCategory || !subcategoryToDelete) return;

    await deleteSubcategoryMutation.mutateAsync({
      categoryId: selectedCategory.id,
      name: subcategoryToDelete.name,
      reason,
    });
    await refetchSelectedSubs();
    setSubcategoryToDelete(null);
  };

  const handleBulkDeleteClick = () => setBulkDeleteOpen(true);
  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedCategoryIds);
    for (const id of ids) {
      try {
        await deleteCategoryMutation.mutateAsync({ id, reason: undefined });
      } catch {
        // continue; toast could be shown per error
      }
    }
    toast({
      title: "Categories deleted",
      description: `${ids.length} categor${ids.length !== 1 ? "ies" : "y"} deleted.`,
    });
    setBulkDeleteOpen(false);
    clearSelection();
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground mt-2">
          Manage product categories and subcategories
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Categories</h2>
        {canManageProducts && (
          <CategoryForm
            open={categoryDialog}
            onOpenChange={setCategoryDialog}
            editingCategory={editingCategory}
            onSubmit={handleCategorySubmit}
            onReset={handleResetCategory}
            isLoading={
              createCategoryMutation.isPending ||
              updateCategoryMutation.isPending
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={listParams.status ?? "all"}
          onValueChange={(v) => handleStatusChange(v as CategoryStatusFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        {searchInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setListParams((prev) => ({
                ...prev,
                page: DEFAULT_PAGE,
              }));
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <CategoryTable
        categories={categories}
        canManageProducts={canManageProducts}
        onEdit={handleEditCategory}
        onDelete={setCategoryToDelete}
        onRestore={(cat) => restoreCategoryMutation.mutate(cat.id)}
        isRestoring={restoreCategoryMutation.isPending}
        subcategoriesByCategory={Object.fromEntries(
          categories.map((cat) => [
            cat.id,
            (cat.subCategories ?? []).map((s) => s.name),
          ]),
        )}
        onManageSubcategories={handleOpenSubcategoryDialog}
        totalItems={pagination.totalItems}
        selectedCategories={selectedCategoryIds}
        onSelectionChange={setSelectedCategoryIds}
        highlightCategoryId={highlightCategoryId}
      />

      <DataTablePagination
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isFetching}
      />

      {/* Subcategory Management Dialog */}
      <Dialog open={subcategoryDialog} onOpenChange={setSubcategoryDialog}>
        <DialogContent allowDismiss={false}>
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
        onDelete={(id, reason) =>
          deleteCategoryMutation.mutateAsync({ id, reason })
        }
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

      {/* Bulk delete confirmation */}
      {canManageProducts && (
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected categories?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedCategoryIds.size} categor
                {selectedCategoryIds.size !== 1 ? "ies" : "y"}. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeleteConfirm}
                disabled={deleteCategoryMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Sticky bulk action bar */}
      {selectedCategoryIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {selectedCategoryIds.size} item
              {selectedCategoryIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {canManageProducts && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="shrink-0"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
