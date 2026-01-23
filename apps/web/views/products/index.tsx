"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { useForm } from "@/hooks/useForm";
import {
  useProductsPaginated,
  useCategories,
  useDiscountTypes,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type Product,
  type Category,
  type ProductListParams,
} from "@/hooks/useProduct";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import { type CreateProductData } from "@/services/productService";
import { ProductForm } from "./components/ProductForm";
import { CategoryForm } from "./components/CategoryForm";
import { ProductTable } from "./components/ProductTable";
import { CategoryTable } from "./components/CategoryTable";
import { DiscountsTab } from "./components/DiscountsTab";
import { ProductDeleteDialog } from "./components/dialogs/ProductDeleteDialog";
import { CategoryDeleteDialog } from "./components/dialogs/CategoryDeleteDialog";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import { BulkUploadDialog } from "./components/BulkUploadDialog";
import { LocationSelector } from "@/components/ui/location-selector";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadProducts } from "@/services/productService";
import type {
  ProductFormValues,
  CategoryFormValues,
  ProductVariationForm,
  ProductDiscountForm,
} from "./types";

export function ProductPage() {
  // ============================================
  // Pagination State
  // ============================================
  const [paginationParams, setPaginationParams] = useState<ProductListParams>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: "",
    locationId: undefined,
  });

  // Fetch paginated products
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useProductsPaginated(paginationParams);

  // Extract products and pagination info from response
  const products = productsResponse?.data ?? [];
  const paginationInfo = productsResponse?.pagination;

  const { data: categories = [] } = useCategories();

  // ============================================
  // Pagination Handlers
  // ============================================
  const handlePageChange = useCallback((newPage: number) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE, // Reset to first page when changing page size
      limit: newPageSize,
    }));
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE, // Reset to first page when searching
      search: newSearch,
    }));
  }, []);

  const handleLocationChange = useCallback((newLocationId: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE, // Reset to first page when changing location
      locationId: newLocationId === "all" ? undefined : newLocationId,
    }));
  }, []);
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageProducts = isAdmin;
  const canSeeCostPrice = isAdmin;

  // Dialog states
  const [productDialog, setProductDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title?: string;
    message: string;
  }>({
    open: false,
    message: "",
  });

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  // Form states
  const [productVariations, setProductVariations] = useState<
    ProductVariationForm[]
  >([]);
  const [productDiscounts, setProductDiscounts] = useState<
    ProductDiscountForm[]
  >([]);

  // Fetch discount types using React Query (cached, no duplicate calls)
  const { data: discountTypes = [] } = useDiscountTypes();

  // Initialize default discounts when opening product dialog for new products
  useEffect(() => {
    if (productDialog && productDiscounts.length === 0 && !editingProduct) {
      const defaultDiscounts = [
        {
          discountTypeName: "Normal",
          discountPercentage: "10",
          startDate: "",
          endDate: "",
          isActive: true,
        },
        {
          discountTypeName: "Special",
          discountPercentage: "15",
          startDate: "",
          endDate: "",
          isActive: true,
        },
        {
          discountTypeName: "Member",
          discountPercentage: "20",
          startDate: "",
          endDate: "",
          isActive: true,
        },
        {
          discountTypeName: "Wholesale",
          discountPercentage: "40",
          startDate: "",
          endDate: "",
          isActive: true,
        },
      ];
      setProductDiscounts(defaultDiscounts);
    }
  }, [productDialog, editingProduct, productDiscounts.length]);

  // Validation functions
  const validateProduct = (values: ProductFormValues) => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!values.imsCode?.trim()) errors.imsCode = "IMS Code is required";
    if (!values.name?.trim()) errors.name = "Product name is required";
    if (!values.categoryId) errors.categoryId = "Category is required";

    // Cost price validation
    const costPrice = Number(values.costPrice);
    if (!values.costPrice || isNaN(costPrice)) {
      errors.costPrice = "Cost price is required";
    } else if (costPrice < 0) {
      errors.costPrice = "Cost price cannot be negative";
    } else if (costPrice === 0) {
      errors.costPrice = "Cost price must be greater than 0";
    }

    // MRP validation
    const mrp = Number(values.mrp);
    if (!values.mrp || isNaN(mrp)) {
      errors.mrp = "MRP is required";
    } else if (mrp < 0) {
      errors.mrp = "MRP cannot be negative";
    } else if (mrp === 0) {
      errors.mrp = "MRP must be greater than 0";
    } else if (costPrice > 0 && mrp < costPrice) {
      errors.mrp = "MRP must be greater than or equal to cost price";
    }

    // Variations validation
    if (productVariations.length === 0) {
      errors._form = "At least one variation is required";
    } else {
      productVariations.forEach((variation, index) => {
        if (!variation.color?.trim()) {
          errors[`variation_${index}_color`] = "Color is required";
        }
        const stockQuantity = Number(variation.stockQuantity);
        if (
          variation.stockQuantity === undefined ||
          variation.stockQuantity === null ||
          variation.stockQuantity === ""
        ) {
          errors[`variation_${index}_stock`] = "Stock quantity is required";
        } else if (isNaN(stockQuantity)) {
          errors[`variation_${index}_stock`] =
            "Stock quantity must be a valid number";
        } else if (stockQuantity < 0) {
          errors[`variation_${index}_stock`] =
            "Stock quantity cannot be negative";
        }
      });
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  const validateCategory = (values: CategoryFormValues) => {
    const errors: Record<string, string> = {};
    if (!values.name?.trim()) errors.name = "Category name is required";
    return Object.keys(errors).length > 0 ? errors : null;
  };

  // Product form
  const productForm = useForm<ProductFormValues>({
    initialValues: {
      imsCode: "",
      name: "",
      categoryId: "",
      description: "",
      length: "",
      breadth: "",
      height: "",
      weight: "",
      costPrice: "",
      mrp: "",
    },
    validate: validateProduct,
    onSubmit: async (values) => {
      try {
        // Additional validation before submission
        if (
          !values.imsCode?.trim() ||
          !values.name?.trim() ||
          !values.categoryId
        ) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message:
              "Please fill in all required fields (IMS Code, Name, and Category).",
          });
          return;
        }

        if (productVariations.length === 0) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message:
              "At least one product variation is required. Please add a variation before submitting.",
          });
          return;
        }

        const costPrice = Number(values.costPrice);
        const mrp = Number(values.mrp);

        if (isNaN(costPrice) || costPrice <= 0) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "Please enter a valid cost price greater than 0.",
          });
          return;
        }

        if (isNaN(mrp) || mrp <= 0) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "Please enter a valid MRP greater than 0.",
          });
          return;
        }

        if (mrp < costPrice) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "MRP must be greater than or equal to the cost price.",
          });
          return;
        }

        const isEditing = !!editingProduct;

        const data: CreateProductData = {
          imsCode: values.imsCode,
          name: values.name,
          categoryId: values.categoryId,
          description: values.description,
          length: values.length ? Number(values.length) : undefined,
          breadth: values.breadth ? Number(values.breadth) : undefined,
          height: values.height ? Number(values.height) : undefined,
          weight: values.weight ? Number(values.weight) : undefined,
          costPrice: costPrice,
          mrp: mrp,
        };

        if (isEditing) {
          data.variations = productVariations.map((v) => ({
            color: v.color,
            stockQuantity: Number(v.stockQuantity) || 0,
            photos:
              v.photos && v.photos.length > 0
                ? v.photos.map((p) => ({
                    photoUrl: p.photoUrl,
                    isPrimary: p.isPrimary,
                  }))
                : undefined,
          }));

          data.discounts = productDiscounts.map((d) => ({
            discountTypeName: d.discountTypeName,
            discountPercentage: Number(d.discountPercentage) || 0,
            startDate:
              d.startDate && d.startDate.trim() !== ""
                ? d.startDate
                : undefined,
            endDate:
              d.endDate && d.endDate.trim() !== "" ? d.endDate : undefined,
            isActive: d.isActive,
          }));
        } else {
          if (productVariations.length > 0) {
            data.variations = productVariations.map((v) => ({
              color: v.color,
              stockQuantity: Number(v.stockQuantity) || 0,
              photos:
                v.photos && v.photos.length > 0
                  ? v.photos.map((p) => ({
                      photoUrl: p.photoUrl,
                      isPrimary: p.isPrimary,
                    }))
                  : undefined,
            }));
          }

          if (productDiscounts.length > 0) {
            data.discounts = productDiscounts.map((d) => ({
              discountTypeName: d.discountTypeName,
              discountPercentage: Number(d.discountPercentage) || 0,
              startDate:
                d.startDate && d.startDate.trim() !== ""
                  ? d.startDate
                  : undefined,
              endDate:
                d.endDate && d.endDate.trim() !== "" ? d.endDate : undefined,
              isActive: d.isActive,
            }));
          }
        }

        if (isEditing) {
          if (!editingProduct?.id) {
            throw new Error(
              "Product ID is missing. Please try editing the product again.",
            );
          }
          await updateProductMutation.mutateAsync({
            id: editingProduct.id,
            data,
          });
          toast({ title: "Product updated successfully" });
        } else {
          await createProductMutation.mutateAsync(data);
          toast({ title: "Product added successfully" });
        }
        setProductDialog(false);
        setEditingProduct(null);
        setProductVariations([]);
        setProductDiscounts([]);
        productForm.reset();
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to save product";
        setErrorDialog({
          open: true,
          title: "Error Saving Product",
          message: errorMessage,
        });
      }
    },
  });

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
  const handleEditProduct = (product: Product) => {
    if (!product || !product.id) {
      toast({
        title: "Error",
        description:
          "Invalid product data. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setEditingProduct(product);
    productForm.values.imsCode = product.imsCode;
    productForm.values.name = product.name;
    productForm.values.categoryId = product.categoryId;
    productForm.values.description = product.description || "";
    productForm.values.length = product.length?.toString() || "";
    productForm.values.breadth = product.breadth?.toString() || "";
    productForm.values.height = product.height?.toString() || "";
    productForm.values.weight = product.weight?.toString() || "";
    productForm.values.costPrice = product.costPrice.toString();
    productForm.values.mrp = product.mrp.toString();

    if (product.variations && product.variations.length > 0) {
      setProductVariations(
        product.variations.map((v) => ({
          color: v.color || "",
          stockQuantity: (v.stockQuantity || 0).toString(),
          photos: (v.photos || []).map((p) => ({
            photoUrl: p.photoUrl,
            isPrimary: p.isPrimary || false,
          })),
        })),
      );
    } else {
      setProductVariations([]);
    }

    if (product.discounts && product.discounts.length > 0) {
      setProductDiscounts(
        product.discounts.map(
          (d): ProductDiscountForm => ({
            discountTypeName: d.discountType?.name || "",
            discountPercentage: (d.discountPercentage || 0).toString(),
            startDate: d.startDate
              ? new Date(d.startDate).toISOString().split("T")[0] || ""
              : "",
            endDate: d.endDate
              ? new Date(d.endDate).toISOString().split("T")[0] || ""
              : "",
            isActive: d.isActive !== undefined ? d.isActive : true,
          }),
        ),
      );
    } else {
      setProductDiscounts([]);
    }

    setProductDialog(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.values.name = category.name;
    categoryForm.values.description = category.description || "";
    setCategoryDialog(true);
  };

  const handleResetProduct = () => {
    setEditingProduct(null);
    setProductVariations([]);
    setProductDiscounts([]);
    productForm.reset();
  };

  const handleResetCategory = () => {
    setEditingCategory(null);
    categoryForm.reset();
  };

  // Variation handlers
  const addVariationToForm = () => {
    setProductVariations([
      ...productVariations,
      { color: "", stockQuantity: "0", photos: [] },
    ]);
  };

  const removeVariationFromForm = (index: number) => {
    setProductVariations(productVariations.filter((_, i) => i !== index));
  };

  const updateVariationInForm = (
    index: number,
    field: "color" | "stockQuantity",
    value: string,
  ) => {
    const updated = [...productVariations];
    updated[index] = {
      color: field === "color" ? value : updated[index]?.color || "",
      stockQuantity:
        field === "stockQuantity"
          ? value
          : updated[index]?.stockQuantity || "0",
      photos: updated[index]?.photos || [],
    };
    setProductVariations(updated);
  };

  const addPhotoToVariation = (variationIndex: number, photoUrl: string) => {
    const updated = [...productVariations];
    const variation = updated[variationIndex];
    if (!variation) return;

    const photos = variation.photos || [];
    const isPrimary = photos.length === 0;
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: [...photos, { photoUrl, isPrimary }],
    };
    setProductVariations(updated);
  };

  const removePhotoFromVariation = (
    variationIndex: number,
    photoIndex: number,
  ) => {
    const updated = [...productVariations];
    const variation = updated[variationIndex];
    if (!variation) return;

    const photos = variation.photos || [];
    const newPhotos = photos.filter((_, i) => i !== photoIndex);
    if (photos[photoIndex]?.isPrimary && newPhotos.length > 0 && newPhotos[0]) {
      newPhotos[0].isPrimary = true;
    }
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: newPhotos,
    };
    setProductVariations(updated);
  };

  const setPrimaryPhoto = (variationIndex: number, photoIndex: number) => {
    const updated = [...productVariations];
    const variation = updated[variationIndex];
    if (!variation) return;

    const photos = [...(variation.photos || [])];
    photos.forEach((photo, i) => {
      photo.isPrimary = i === photoIndex;
    });
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: photos,
    };
    setProductVariations(updated);
  };

  // Discount handlers
  const addDiscountToForm = () => {
    setProductDiscounts([
      ...productDiscounts,
      {
        discountTypeName: "",
        discountPercentage: "0",
        startDate: "",
        endDate: "",
        isActive: true,
      },
    ]);
  };

  const removeDiscountFromForm = (index: number) => {
    setProductDiscounts(productDiscounts.filter((_, i) => i !== index));
  };

  const updateDiscountInForm = (
    index: number,
    field:
      | "discountTypeName"
      | "discountPercentage"
      | "startDate"
      | "endDate"
      | "isActive",
    value: string | boolean,
  ) => {
    const updated = [...productDiscounts];
    updated[index] = {
      discountTypeName:
        field === "discountTypeName"
          ? (value as string)
          : updated[index]?.discountTypeName || "",
      discountPercentage:
        field === "discountPercentage"
          ? (value as string)
          : updated[index]?.discountPercentage || "0",
      startDate:
        field === "startDate"
          ? (value as string)
          : updated[index]?.startDate || "",
      endDate:
        field === "endDate" ? (value as string) : updated[index]?.endDate || "",
      isActive:
        field === "isActive"
          ? (value as boolean)
          : updated[index]?.isActive !== undefined
            ? updated[index].isActive
            : true,
    };
    setProductDiscounts(updated);
  };

  // Export handlers
  const handleExport = useCallback(
    async (format: "excel" | "csv") => {
      try {
        // Get selected product IDs or undefined (which means export all)
        const productIdsToExport =
          selectedProductIds.size > 0
            ? Array.from(selectedProductIds)
            : undefined;

        // Call backend download endpoint
        await downloadProducts(format, productIdsToExport);

        const count =
          productIdsToExport?.length || paginationInfo?.totalItems || 0;
        toast({
          title: "Download started",
          description: `Downloading ${count} product(s) as ${format.toUpperCase()}`,
        });

        // Clear selection after export
        if (selectedProductIds.size > 0) {
          setSelectedProductIds(new Set());
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        toast({
          title: "Download failed",
          description: err.message || "Failed to download products",
          variant: "destructive",
        });
      }
    },
    [selectedProductIds, paginationInfo?.totalItems, toast],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground mt-2">
          Manage products, categories, and variations
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Product Catalog</h2>
              <LocationSelector
                value={paginationParams.locationId || "all"}
                onChange={handleLocationChange}
                placeholder="Filter by location"
                allLabel="All Locations"
                className="w-[200px]"
              />
            </div>
            {canManageProducts && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                      {selectedProductIds.size > 0 && (
                        <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                          {selectedProductIds.size}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleExport("excel")}
                      disabled={isProductsLoading}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Download as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("csv")}
                      disabled={isProductsLoading}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  onClick={() => setBulkUploadDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <ProductForm
                  open={productDialog}
                  onOpenChange={setProductDialog}
                  form={productForm}
                  editingProduct={editingProduct}
                  categories={categories}
                  variations={productVariations}
                  discounts={productDiscounts}
                  discountTypes={discountTypes}
                  onReset={handleResetProduct}
                  onAddVariation={addVariationToForm}
                  onRemoveVariation={removeVariationFromForm}
                  onUpdateVariation={updateVariationInForm}
                  onAddPhoto={addPhotoToVariation}
                  onRemovePhoto={removePhotoFromVariation}
                  onSetPrimaryPhoto={setPrimaryPhoto}
                  onAddDiscount={addDiscountToForm}
                  onRemoveDiscount={removeDiscountFromForm}
                  onUpdateDiscount={updateDiscountInForm}
                  onShowError={(title, message) =>
                    setErrorDialog({ open: true, title, message })
                  }
                  validateProduct={validateProduct}
                />
              </div>
            )}
          </div>

          <ProductTable
            products={products}
            categories={categories}
            canSeeCostPrice={canSeeCostPrice}
            canManageProducts={canManageProducts}
            onEdit={handleEditProduct}
            onDelete={setProductToDelete}
            // Pagination props
            pagination={{
              currentPage:
                paginationInfo?.currentPage ??
                paginationParams.page ??
                DEFAULT_PAGE,
              totalPages: paginationInfo?.totalPages ?? 1,
              totalItems: paginationInfo?.totalItems ?? 0,
              itemsPerPage:
                paginationInfo?.itemsPerPage ??
                paginationParams.limit ??
                DEFAULT_LIMIT,
              hasNextPage: paginationInfo?.hasNextPage ?? false,
              hasPrevPage: paginationInfo?.hasPrevPage ?? false,
            }}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            // Search props
            searchQuery={paginationParams.search ?? ""}
            onSearchChange={handleSearchChange}
            // Loading states
            isLoading={isProductsLoading}
            isFetching={isProductsFetching}
            // Selection props
            selectedProducts={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Categories</h2>
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
            canManageProducts={canManageProducts}
            onEdit={handleEditCategory}
            onDelete={setCategoryToDelete}
          />
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <DiscountsTab products={products} />
        </TabsContent>
      </Tabs>

      <ProductDeleteDialog
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onDelete={deleteProductMutation.mutateAsync}
      />

      <CategoryDeleteDialog
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onDelete={deleteCategoryMutation.mutateAsync}
      />

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        message={errorDialog.message}
        onGoBack={() => {
          // Keep dialog open on error so user can fix issues
        }}
      />

      <BulkUploadDialog
        open={bulkUploadDialog}
        onOpenChange={setBulkUploadDialog}
      />
    </div>
  );
}
