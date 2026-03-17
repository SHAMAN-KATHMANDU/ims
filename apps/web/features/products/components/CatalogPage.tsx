"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";
import { useProductFormAdapter } from "../hooks/use-product-form-adapter";
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
} from "@/features/products";
import { useVendorsPaginated } from "@/features/vendors";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import {
  useProductSelectionStore,
  selectSelectedProductIds,
  selectClearSelection,
} from "@/store/product-selection-store";
import { type CreateProductData, downloadProducts } from "@/features/products";
import { ProductForm } from "./components/ProductForm";
import { ProductTable } from "./components/ProductTable";
import { ProductDetailSheet } from "./components/ProductDetailSheet";
import { ProductDeleteDialog } from "./components/dialogs/ProductDeleteDialog";
import { VariationDeleteDialog } from "./components/dialogs/VariationDeleteDialog";
import { getVariationAttributeDisplay } from "./utils/helpers";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import { BulkUploadDialog } from "./components/BulkUploadDialog";
import { EnvFeatureGuard, FeatureGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Package,
  AlertTriangle,
  X,
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
    lowStock: undefined,
    sortBy: "dateCreated",
    sortOrder: "desc",
  });

  // Fetch paginated products
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useProductsPaginated(paginationParams);

  // Low-stock count for summary card (same filters, lowStock=true, minimal payload)
  const { data: lowStockResponse } = useProductsPaginated({
    ...paginationParams,
    lowStock: true,
    page: 1,
    limit: 1,
  });
  const lowStockCount = lowStockResponse?.pagination?.totalItems ?? 0;

  // Extract products and pagination info from response
  const products = productsResponse?.data ?? [];
  const paginationInfo = productsResponse?.pagination;

  const { data: categories = [] } = useCategories();
  const { data: vendorsResponse } = useVendorsPaginated({
    page: 1,
    limit: 10,
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

  const handleLowStockFilter = useCallback(() => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      lowStock: true,
    }));
  }, []);

  const handleViewAllProducts = useCallback(() => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      lowStock: undefined,
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
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Form states
  const [productVariations, setProductVariations] = useState<
    ProductVariationForm[]
  >([]);
  const [productDiscounts, setProductDiscounts] = useState<
    ProductDiscountForm[]
  >([]);
  const [mrpBelowCpAccepted, setMrpBelowCpAccepted] = useState(false);

  // Fetch discount types
  const { data: discountTypes = [] } = useDiscountTypes();

  // Validation functions
  const validateProduct = (values: ProductFormValues) => {
    const errors: Record<string, string> = {};

    if (!(values.imsCode ?? "").trim())
      errors.imsCode = "IMS code (barcode) is required";
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
    } else if (costPrice > 0 && mrp < costPrice && !mrpBelowCpAccepted) {
      errors.mrp = "MRP must be greater than or equal to cost price";
    }

    if (productVariations.length === 0) {
      errors._form = "At least one variation is required";
    } else {
      productVariations.forEach((variation, index) => {
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

  // Product form (uses react-hook-form with mode: "onBlur" for real-time validation)
  const productForm = useProductFormAdapter({
    initialValues: {
      imsCode: "",
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
    getAdditionalErrors: (vals) => validateProduct(vals) ?? {},
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

        if (mrp < costPrice && !mrpBelowCpAccepted) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "MRP must be greater than or equal to the cost price.",
          });
          return;
        }

        const isEditing = !!editingProduct;

        const data: CreateProductData = {
          imsCode: (values.imsCode ?? "").trim(),
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
            locationId: v.locationId,
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
            attributes:
              v.attributes && v.attributes.length > 0
                ? v.attributes
                : undefined,
          }));

          data.discounts = productDiscounts
            .filter((d) => d.discountTypeId?.trim())
            .map((d) => ({
              discountTypeId: d.discountTypeId,
              discountPercentage: Math.min(
                100,
                Math.max(0, Number(d.discountPercentage) || 0),
              ),
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
            data.discounts = productDiscounts
              .filter((d) => d.discountTypeId?.trim())
              .map((d) => ({
                discountTypeId: d.discountTypeId,
                discountPercentage: Math.min(
                  100,
                  Math.max(0, Number(d.discountPercentage) || 0),
                ),
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
      router.push(`${basePath}/products/${product.id}/edit`);
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
    const categoryId =
      product.categoryId ??
      (product as { category?: { id: string } }).category?.id ??
      "";
    productForm.setValues({
      imsCode: product.imsCode ?? "",
      name: product.name,
      categoryId,
      subCategory: product.subCategory ?? "",
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
      const activeLocationId = paginationParams.locationId;
      setProductVariations(
        product.variations.map((v) => {
          const inv = v.locationInventory ?? [];
          let locEntry = activeLocationId
            ? inv.find((i) => i.location?.id === activeLocationId)
            : inv[0];
          if (!locEntry && inv.length > 0) locEntry = inv[0];
          const stock = locEntry ? locEntry.quantity : (v.stockQuantity ?? 0);
          const locId = locEntry?.location?.id;
          const locName = locEntry?.location
            ? (locEntry.location as { name?: string }).name
            : undefined;
          return {
            id: v.id,
            stockQuantity: stock.toString(),
            locationId: locId,
            locationName: locName,
            subVariants: (v.subVariations || []).map((s) => s.name),
            photos: (v.photos || []).map((p) => ({
              photoUrl: p.photoUrl,
              isPrimary: p.isPrimary || false,
            })),
            attributes: (
              (
                v as {
                  attributes?: Array<{
                    attributeTypeId?: string;
                    attributeValueId?: string;
                    attributeType?: { id: string };
                    attributeValue?: { id: string };
                  }>;
                }
              ).attributes?.map((a) => ({
                attributeTypeId: a.attributeTypeId ?? a.attributeType?.id ?? "",
                attributeValueId:
                  a.attributeValueId ?? a.attributeValue?.id ?? "",
              })) ?? []
            ).filter((a) => a.attributeTypeId && a.attributeValueId),
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
    setMrpBelowCpAccepted(false);
    productForm.reset();
  };

  // Variation handlers
  const addVariationToForm = () => {
    setProductVariations((prev) => [
      ...prev,
      {
        stockQuantity: "0",
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
    field: "stockQuantity" | "attributes",
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
      subVariants: variation.subVariants ?? [],
      photos: photos,
    };
    setProductVariations(updated);
  };

  // Export handlers
  const handleExport = useCallback(
    async (format: "excel" | "csv") => {
      try {
        const productIdsToExport =
          selectedProductIds.size > 0
            ? Array.from(selectedProductIds)
            : undefined;

        const filters =
          productIdsToExport == null
            ? {
                search: paginationParams.search || undefined,
                locationId: paginationParams.locationId,
                categoryId: paginationParams.categoryId,
                subCategoryId: paginationParams.subCategoryId,
                subCategory: paginationParams.subCategory,
                vendorId: paginationParams.vendorId,
                dateFrom: paginationParams.dateFrom,
                dateTo: paginationParams.dateTo,
                lowStock: paginationParams.lowStock,
              }
            : undefined;

        await downloadProducts(format, productIdsToExport, filters);

        const count =
          productIdsToExport?.length ?? paginationInfo?.totalItems ?? 0;
        toast({
          title: "Download started",
          description: `Downloading ${count} product(s) as ${format.toUpperCase()}`,
        });

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
    [
      selectedProductIds,
      paginationParams,
      paginationInfo?.totalItems,
      toast,
      clearSelection,
    ],
  );

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Product Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Manage products and their variations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border border-border/80 bg-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {paginationInfo?.totalItems ?? 0}
            </p>
            <button
              type="button"
              onClick={handleViewAllProducts}
              className="text-xs text-primary hover:underline mt-1 font-medium"
            >
              Check products
            </button>
          </CardContent>
        </Card>
        <Card className="border border-border/80 bg-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock at minimum limit
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{lowStockCount}</p>
            <button
              type="button"
              onClick={handleLowStockFilter}
              className="text-xs text-primary hover:underline mt-1 font-medium"
            >
              Check products
            </button>
          </CardContent>
        </Card>
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
            <EnvFeatureGuard envFeature={EnvFeature.BULK_UPLOAD_PRODUCTS}>
              <FeatureGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
                {isMobile ? (
                  <Button variant="outline" asChild>
                    <Link href={`${basePath}/products/bulk-upload`}>
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
              </FeatureGuard>
            </EnvFeatureGuard>
            {isMobile ? (
              <Button asChild>
                <Link href={`${basePath}/products/new`} className="gap-2">
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
                onDiscountsChange={setProductDiscounts}
                onReset={handleResetProduct}
                onAddVariation={addVariationToForm}
                onRemoveVariation={removeVariationFromForm}
                onUpdateVariation={updateVariationInForm}
                onUpdateSubVariants={updateSubVariantsInForm}
                onAddPhoto={addPhotoToVariation}
                onRemovePhoto={removePhotoFromVariation}
                onSetPrimaryPhoto={setPrimaryPhoto}
                onShowError={(title, message) =>
                  setErrorDialog({ open: true, title, message })
                }
                validateProduct={validateProduct}
                mrpBelowCpAccepted={mrpBelowCpAccepted}
                onMrpBelowCpAcceptedChange={setMrpBelowCpAccepted}
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
        onView={readOnly ? (product) => setViewingProduct(product) : undefined}
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lowStock"
                      checked={paginationParams.lowStock === true}
                      onCheckedChange={(checked) =>
                        setPaginationParams((prev) => ({
                          ...prev,
                          page: DEFAULT_PAGE,
                          lowStock: checked === true ? true : undefined,
                        }))
                      }
                    />
                    <label
                      htmlFor="lowStock"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Low stock only
                    </label>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground pt-1 border-t">
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

      <ProductDetailSheet
        product={viewingProduct}
        open={!!viewingProduct}
        onOpenChange={(open) => !open && setViewingProduct(null)}
        onEdit={canManageProducts ? handleEditProduct : undefined}
      />

      <ProductDeleteDialog
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onDelete={(id, reason) =>
          deleteProductMutation.mutateAsync({ id, reason })
        }
      />

      <VariationDeleteDialog
        productName={variationToDelete?.product.name ?? null}
        variationImsCode={
          variationToDelete
            ? getVariationAttributeDisplay(
                variationToDelete.product.variations?.find(
                  (v) => v.id === variationToDelete.variationId,
                ) ?? {},
              ) || variationToDelete.variationId
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

      {/* Sticky bulk action bar when items selected */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {selectedProductIds.size} item
              {selectedProductIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {canManageProducts && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
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
