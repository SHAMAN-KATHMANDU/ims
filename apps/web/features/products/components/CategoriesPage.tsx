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
import { CategoryForm } from "./CategoryForm";
import { CategoryTable } from "./CategoryTable";
import { CategoryDeleteDialog } from "./dialogs/CategoryDeleteDialog";
import { SubcategoryDeleteDialog } from "./dialogs/SubcategoryDeleteDialog";
import { ErrorDialog } from "./dialogs/ErrorDialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, X } from "lucide-react";
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
    sortBy: "name",
    sortOrder: "asc",
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

  const handleCategorySort = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc" | "none") => {
      if (sortOrder === "none") {
        setListParams((prev) => ({
          ...prev,
          page: DEFAULT_PAGE,
          sortBy: "name",
          sortOrder: "asc",
        }));
        return;
      }
      setListParams((prev) => ({
        ...prev,
        page: DEFAULT_PAGE,
        sortBy,
        sortOrder,
      }));
    },
    [],
  );

  const handleStatusChange = useCallback((status: CategoryStatusFilter) => {
    setListParams((prev) => ({ ...prev, page: DEFAULT_PAGE, status }));
  }, []);

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
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
  const {
    data: editCategorySubcategories = [],
    isPending: isEditSubcategoriesPending,
  } = useCategorySubcategories(editingCategory?.id ?? "");
  const createSubcategoryMutation = useCreateSubcategory();
  const deleteSubcategoryMutation = useDeleteSubcategory();

  const handleCategorySubmit = async (values: CategoryFormInput) => {
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: { name: values.name, description: values.description },
        });
        if (values.subcategories?.length) {
          for (const name of values.subcategories) {
            if (name?.trim()) {
              await createSubcategoryMutation.mutateAsync({
                categoryId: editingCategory.id,
                name: name.trim(),
              });
            }
          }
        }
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

  const handleDeleteSubcategory = (sub: string) => {
    if (!editingCategory) return;
    setSubcategoryToDelete({
      name: sub,
      categoryName: editingCategory.name,
    });
  };

  const handleConfirmDeleteSubcategory = async (reason?: string) => {
    if (!editingCategory || !subcategoryToDelete) return;

    await deleteSubcategoryMutation.mutateAsync({
      categoryId: editingCategory.id,
      name: subcategoryToDelete.name,
      reason,
    });
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
            serverSubcategories={editCategorySubcategories}
            isLoadingServerSubcategories={
              Boolean(editingCategory) && isEditSubcategoriesPending
            }
            onRemoveServerSubcategory={handleDeleteSubcategory}
            isLoading={
              createCategoryMutation.isPending ||
              updateCategoryMutation.isPending ||
              createSubcategoryMutation.isPending ||
              deleteSubcategoryMutation.isPending
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search categories"
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
          <SelectTrigger
            className="w-[140px]"
            aria-label="Filter categories by status"
          >
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
        sortBy={listParams.sortBy}
        sortOrder={listParams.sortOrder}
        onSort={handleCategorySort}
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
        <div
          role="region"
          aria-label="Bulk selection actions"
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium" aria-live="polite">
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
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
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
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
