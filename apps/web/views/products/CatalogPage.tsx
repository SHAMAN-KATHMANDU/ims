"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";
import { useForm } from "@/hooks/useForm";
import {
  useProductsPaginated,
  useCategories,
  useDiscountTypes,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useDeleteVariation,
  useCategorySubcategories,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type Product,
  type ProductListParams,
} from "@/hooks/useProduct";
import { useVendorsPaginated } from "@/hooks/useVendors";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import {
  useProductSelectionStore,
  selectSelectedProductIds,
  selectClearSelection,
} from "@/store/product-selection-store";
import { type CreateProductData } from "@/services/productService";
import { downloadProducts } from "@/services/productService";
import { ProductForm } from "./components/ProductForm";
import { ProductTable } from "./components/ProductTable";
import { ProductDeleteDialog } from "./components/dialogs/ProductDeleteDialog";
import { VariationDeleteDialog } from "./components/dialogs/VariationDeleteDialog";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import { BulkUploadDialog } from "./components/BulkUploadDialog";
import { LocationSelector } from "@/components/ui/location-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ProductFormValues,
  ProductVariationForm,
  ProductDiscountForm,
} from "./types";

interface CatalogPageProps {
  /** When true, catalog is read-only for all roles (no Add/Bulk Upload/Download/edit/delete). */
  readOnly?: boolean;
}

export function CatalogPage({ readOnly = false }: CatalogPageProps) {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();

  // ============================================
  // Pagination State
  // ============================================
  const [paginationParams, setPaginationParams] = useState<ProductListParams>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: "",
    locationId: undefined,
    categoryId: undefined,
    subCategory: undefined,
    vendorId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    sortBy: "dateCreated",
    sortOrder: "desc",
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
  const { data: vendorsResponse } = useVendorsPaginated({
    page: 1,
    limit: 200,
  });
  const vendors = vendorsResponse?.data ?? [];
  const { data: subcategories = [] } = useCategorySubcategories(
    paginationParams.categoryId ?? "",
  );

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
      page: DEFAULT_PAGE,
      limit: newPageSize,
    }));
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      search: newSearch,
    }));
  }, []);

  const handleLocationChange = useCallback((newLocationId: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      locationId: newLocationId === "all" ? undefined : newLocationId,
    }));
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      categoryId: categoryId === "all" ? undefined : categoryId,
      subCategory: undefined,
    }));
  }, []);

  const handleSubCategoryChange = useCallback((subCategory: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      subCategory: subCategory === "all" ? undefined : subCategory,
    }));
  }, []);

  const handleVendorChange = useCallback((vendorId: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      vendorId: vendorId === "all" ? undefined : vendorId,
    }));
  }, []);

  const handleDateFromChange = useCallback((dateFrom: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      dateFrom: dateFrom || undefined,
    }));
  }, []);

  const handleDateToChange = useCallback((dateTo: string) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      dateTo: dateTo || undefined,
    }));
  }, []);

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      setPaginationParams((prev) => ({
        ...prev,
        page: DEFAULT_PAGE,
        sortBy,
        sortOrder,
      }));
    },
    [],
  );

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const deleteVariationMutation = useDeleteVariation();
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageProducts = readOnly ? false : isAdmin;
  const canSeeCostPrice = isAdmin;

  // Zustand store for product selection
  const selectedProductIds = useProductSelectionStore(selectSelectedProductIds);
  const clearSelection = useProductSelectionStore(selectClearSelection);
  const setSelectedProductIds = useProductSelectionStore(
    (state) => state.setProducts,
  );

  // Dialog states
  const [productDialog, setProductDialog] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [variationToDelete, setVariationToDelete] = useState<{
    product: Product;
    variationId: string;
  } | null>(null);
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

  // Form states
  const [productVariations, setProductVariations] = useState<
    ProductVariationForm[]
  >([]);
  const [productDiscounts, setProductDiscounts] = useState<
    ProductDiscountForm[]
  >([]);

  // Fetch discount types
  const { data: discountTypes = [] } = useDiscountTypes();

  // Initialize default discounts when opening product dialog for new products
  useEffect(() => {
    if (
      productDialog &&
      productDiscounts.length === 0 &&
      !editingProduct &&
      discountTypes.length > 0
    ) {
      const idByName = new Map(discountTypes.map((dt) => [dt.name, dt.id]));
      const defaults: Array<{ name: string; pct: string }> = [
        { name: "Non-Member", pct: "10" },
        { name: "Special", pct: "15" },
        { name: "Member", pct: "20" },
        { name: "Wholesale", pct: "40" },
      ];
      const defaultDiscounts = defaults
        .filter((d) => idByName.has(d.name))
        .map((d) => ({
          discountTypeId: idByName.get(d.name)!,
          discountPercentage: d.pct,
          startDate: "",
          endDate: "",
          isActive: true,
        }));
      if (defaultDiscounts.length > 0) {
        setProductDiscounts(defaultDiscounts);
      }
    }
  }, [productDialog, editingProduct, productDiscounts.length, discountTypes]);

  // Validation functions
  const validateProduct = (values: ProductFormValues) => {
    const errors: Record<string, string> = {};

    if (!values.name?.trim()) errors.name = "Product name is required";
    if (!values.categoryId) errors.categoryId = "Category is required";

    const costPrice = Number(values.costPrice);
    if (!values.costPrice || isNaN(costPrice)) {
      errors.costPrice = "Cost price is required";
    } else if (costPrice < 0) {
      errors.costPrice = "Cost price cannot be negative";
    } else if (costPrice === 0) {
      errors.costPrice = "Cost price must be greater than 0";
    }

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

    if (productVariations.length === 0) {
      errors._form = "At least one variation is required";
    } else {
      productVariations.forEach((variation, index) => {
        if (!(variation.imsCode ?? "").trim()) {
          errors[`variation_${index}_imsCode`] = "IMS code is required";
        }
        // Variant name is auto-derived from EAV attributes
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
      // Duplicate variation: same IMS code as another variation in the list
      const imsCodes = productVariations
        .map((v) => (v.imsCode ?? "").trim())
        .filter(Boolean);
      const duplicateIms = imsCodes.some(
        (code, i) => imsCodes.indexOf(code) !== i,
      );
      if (duplicateIms) {
        errors._form = "This product already exists.";
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  // Product form
  const productForm = useForm<ProductFormValues>({
    initialValues: {
      name: "",
      categoryId: "",
      subCategory: "",
      description: "",
      length: "",
      breadth: "",
      height: "",
      weight: "",
      costPrice: "",
      mrp: "",
      vendorId: undefined,
    },
    validate: validateProduct,
    onSubmit: async (values) => {
      try {
        if (!values.name?.trim() || !values.categoryId) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "Please fill in Name and Category.",
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
          name: values.name,
          categoryId: values.categoryId,
          description: values.description,
          subCategory: values.subCategory?.trim() || undefined,
          length: values.length ? Number(values.length) : undefined,
          breadth: values.breadth ? Number(values.breadth) : undefined,
          height: values.height ? Number(values.height) : undefined,
          weight: values.weight ? Number(values.weight) : undefined,
          costPrice: costPrice,
          mrp: mrp,
          vendorId: values.vendorId || undefined,
        };

        if (isEditing) {
          data.variations = productVariations.map((v) => ({
            id: v.id,
            stockQuantity: Number(v.stockQuantity) || 0,
            imsCode: (v.imsCode ?? "").trim(),
            subVariants:
              v.subVariants && v.subVariants.length > 0
                ? v.subVariants.filter(Boolean)
                : undefined,
            photos:
              v.photos && v.photos.length > 0
                ? v.photos.map((p) => ({
                    photoUrl: p.photoUrl,
                    isPrimary: p.isPrimary,
                  }))
                : undefined,
          }));

          data.discounts = productDiscounts.map((d) => ({
            discountTypeId: d.discountTypeId,
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
              stockQuantity: Number(v.stockQuantity) || 0,
              imsCode: (v.imsCode ?? "").trim(),
              subVariants:
                v.subVariants && v.subVariants.length > 0
                  ? v.subVariants.filter(Boolean)
                  : undefined,
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
              discountTypeId: d.discountTypeId,
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

  // Handlers
  const handleEditProduct = (product: Product) => {
    if (isMobile) {
      router.push(`${basePath}/product/${product.id}/edit`);
      return;
    }
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
    productForm.setValues({
      name: product.name,
      categoryId: product.categoryId,
      subCategory: product.subCategory || "",
      description: product.description || "",
      length: product.length?.toString() || "",
      breadth: product.breadth?.toString() || "",
      height: product.height?.toString() || "",
      weight: product.weight?.toString() || "",
      costPrice: product.costPrice.toString(),
      mrp: product.mrp.toString(),
      vendorId: product.vendorId ?? undefined,
    });

    if (product.variations && product.variations.length > 0) {
      setProductVariations(
        product.variations.map((v) => {
          const hasLocationInv =
            v.locationInventory && v.locationInventory.length > 0;
          const stock = hasLocationInv
            ? (v.locationInventory as Array<{ quantity: number }>).reduce(
                (s, inv) => s + inv.quantity,
                0,
              )
            : (v.stockQuantity ?? 0);
          return {
            id: v.id,
            stockQuantity: stock.toString(),
            imsCode: (v as { imsCode?: string }).imsCode ?? "",
            subVariants: (v.subVariations || []).map((s) => s.name),
            photos: (v.photos || []).map((p) => ({
              photoUrl: p.photoUrl,
              isPrimary: p.isPrimary || false,
            })),
            attributes:
              (
                v as {
                  attributes?: Array<{
                    attributeTypeId: string;
                    attributeValueId: string;
                  }>;
                }
              ).attributes?.map((a) => ({
                attributeTypeId: a.attributeTypeId,
                attributeValueId: a.attributeValueId,
              })) ?? [],
          };
        }),
      );
    } else {
      setProductVariations([]);
    }

    if (product.discounts && product.discounts.length > 0) {
      setProductDiscounts(
        product.discounts.map(
          (d): ProductDiscountForm => ({
            discountTypeId: d.discountTypeId || "",
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

  const handleResetProduct = () => {
    setEditingProduct(null);
    setProductVariations([]);
    setProductDiscounts([]);
    productForm.reset();
  };

  // Variation handlers
  const addVariationToForm = () => {
    setProductVariations((prev) => [
      ...prev,
      {
        stockQuantity: "0",
        imsCode: "",
        subVariants: [],
        photos: [],
        attributes: [],
      },
    ]);
  };

  const removeVariationFromForm = (index: number) => {
    setProductVariations(productVariations.filter((_, i) => i !== index));
  };

  const updateVariationInForm = (
    index: number,
    field: "stockQuantity" | "imsCode" | "attributes",
    value:
      | string
      | Array<{ attributeTypeId: string; attributeValueId: string }>,
  ) => {
    setProductVariations((prev) => {
      const updated = [...prev];
      const prevVar = updated[index];
      if (!prevVar) return prev;
      updated[index] = {
        ...prevVar,
        stockQuantity:
          field === "stockQuantity" ? (value as string) : prevVar.stockQuantity,
        imsCode:
          field === "imsCode" ? (value as string) : (prevVar.imsCode ?? ""),
        attributes:
          field === "attributes"
            ? (value as Array<{
                attributeTypeId: string;
                attributeValueId: string;
              }>)
            : (prevVar.attributes ?? []),
      };
      return updated;
    });
  };

  const updateSubVariantsInForm = (index: number, subVariants: string[]) => {
    const updated = [...productVariations];
    const v = updated[index];
    if (!v) return;
    updated[index] = {
      ...v,
      subVariants: subVariants.filter((s) => s.trim() !== ""),
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
      stockQuantity: variation.stockQuantity || "0",
      imsCode: variation.imsCode ?? "",
      subVariants: variation.subVariants ?? [],
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
      stockQuantity: variation.stockQuantity || "0",
      imsCode: variation.imsCode ?? "",
      subVariants: variation.subVariants ?? [],
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
      stockQuantity: variation.stockQuantity || "0",
      imsCode: variation.imsCode ?? "",
      subVariants: variation.subVariants ?? [],
      photos: photos,
    };
    setProductVariations(updated);
  };

  // Discount handlers
  const addDiscountToForm = () => {
    setProductDiscounts([
      ...productDiscounts,
      {
        discountTypeId: "",
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
      | "discountTypeId"
      | "discountPercentage"
      | "startDate"
      | "endDate"
      | "isActive",
    value: string | boolean,
  ) => {
    const updated = [...productDiscounts];
    updated[index] = {
      discountTypeId:
        field === "discountTypeId"
          ? (value as string)
          : updated[index]?.discountTypeId || "",
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
          clearSelection();
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
    [selectedProductIds, paginationInfo?.totalItems, toast, clearSelection],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Manage products and their variations
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
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
            {isMobile ? (
              <Button variant="outline" asChild>
                <Link href={`${basePath}/product/bulk-upload`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setBulkUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            )}
            {isMobile ? (
              <Button asChild>
                <Link href={`${basePath}/product/new`} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Link>
              </Button>
            ) : (
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
                onUpdateSubVariants={updateSubVariantsInForm}
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
            )}
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
        onDeleteVariation={(product, variationId) =>
          setVariationToDelete({ product, variationId })
        }
        selectedLocationId={paginationParams.locationId ?? undefined}
        filterBar={
          <>
            <LocationSelector
              value={paginationParams.locationId || "all"}
              onChange={handleLocationChange}
              placeholder="Location"
              allLabel="All"
              className="h-9 w-[130px] text-sm shrink-0"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 text-sm shrink-0"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Category & vendor
                  </p>
                  <div className="grid gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={paginationParams.categoryId ?? "all"}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subcategory</Label>
                      <Select
                        value={paginationParams.subCategory ?? "all"}
                        onValueChange={handleSubCategoryChange}
                        disabled={!paginationParams.categoryId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {subcategories.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vendor</Label>
                      <Select
                        value={paginationParams.vendorId ?? "all"}
                        onValueChange={handleVendorChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground pt-1">
                    Date & sort
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input
                        type="date"
                        value={paginationParams.dateFrom ?? ""}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input
                        type="date"
                        value={paginationParams.dateTo ?? ""}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sort</Label>
                    <Select
                      value={`${paginationParams.sortBy ?? "dateCreated"}-${paginationParams.sortOrder ?? "desc"}`}
                      onValueChange={(v) => {
                        const [sortBy, sortOrder] = v.split("-") as [
                          string,
                          "asc" | "desc",
                        ];
                        handleSortChange(sortBy, sortOrder);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dateCreated-desc">
                          Newest first
                        </SelectItem>
                        <SelectItem value="dateCreated-asc">
                          Oldest first
                        </SelectItem>
                        <SelectItem value="name-asc">Name A–Z</SelectItem>
                        <SelectItem value="name-desc">Name Z–A</SelectItem>
                        <SelectItem value="mrp-desc">MRP high–low</SelectItem>
                        <SelectItem value="mrp-asc">MRP low–high</SelectItem>
                        <SelectItem value="vendorname-asc">
                          Vendor A–Z
                        </SelectItem>
                        <SelectItem value="vendorname-desc">
                          Vendor Z–A
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </>
        }
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
        searchQuery={paginationParams.search ?? ""}
        onSearchChange={handleSearchChange}
        isLoading={isProductsLoading}
        isFetching={isProductsFetching}
        // Selection props
        selectedProducts={selectedProductIds}
        onSelectionChange={setSelectedProductIds}
      />

      <ProductDeleteDialog
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onDelete={deleteProductMutation.mutateAsync}
      />

      <VariationDeleteDialog
        productName={variationToDelete?.product.name ?? null}
        variationImsCode={
          variationToDelete
            ? (variationToDelete.product.variations?.find(
                (v) => v.id === variationToDelete.variationId,
              )?.imsCode ?? variationToDelete.variationId)
            : null
        }
        onClose={() => setVariationToDelete(null)}
        onDelete={async () => {
          if (!variationToDelete) return;
          await deleteVariationMutation.mutateAsync({
            productId: variationToDelete.product.id,
            variationId: variationToDelete.variationId,
          });
        }}
      />

      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        message={errorDialog.message}
        onGoBack={() => {}}
      />

      <BulkUploadDialog
        open={bulkUploadDialog}
        onOpenChange={setBulkUploadDialog}
      />
    </div>
  );
}
