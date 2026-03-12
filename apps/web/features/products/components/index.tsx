"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";
import { useProductFormAdapter } from "../hooks/use-product-form-adapter";
import {
  useProductsPaginated,
  useProduct,
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
import { useAttributeTypes } from "@/features/products";
import { useVendorsPaginated } from "@/features/vendors";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import {
  useProductSelectionStore,
  selectSelectedProductIds,
  selectClearSelection,
} from "@/store/product-selection-store";
import { type CreateProductData } from "@/features/products";
import { ProductForm } from "./components/ProductForm";
import { ProductTable } from "./components/ProductTable";
import { ProductDeleteDialog } from "./components/dialogs/ProductDeleteDialog";
import { VariationDeleteDialog } from "./components/dialogs/VariationDeleteDialog";
import { getVariationAttributeDisplay } from "./utils/helpers";
import { ErrorDialog } from "./components/dialogs/ErrorDialog";
import { BulkUploadDialog } from "./components/BulkUploadDialog";
import { FeatureGuard } from "@/features/flags";
import { Feature } from "@repo/shared";
import { LocationSelector } from "@/components/ui/location-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  ArrowUpDown,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadProducts } from "@/features/products";
import type {
  ProductFormValues,
  ProductVariationForm,
  ProductDiscountForm,
} from "./types";

export function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const searchParams = useSearchParams();
  const hasAppliedUrlParams = useRef(false);
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
    lowStock: undefined,
  });

  // Apply URL search params once on mount (e.g. from dashboard/analytics links)
  useEffect(() => {
    if (hasAppliedUrlParams.current) return;
    const lowStock = searchParams.get("lowStock");
    const locationId = searchParams.get("locationId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const vendorId = searchParams.get("vendorId") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    if (
      lowStock !== null ||
      locationId !== undefined ||
      categoryId !== undefined ||
      vendorId !== undefined ||
      dateFrom !== undefined ||
      dateTo !== undefined
    ) {
      hasAppliedUrlParams.current = true;
      setPaginationParams((prev) => ({
        ...prev,
        page: DEFAULT_PAGE,
        lowStock:
          lowStock === "1" || lowStock === "true" ? true : prev.lowStock,
        locationId: locationId ?? prev.locationId,
        categoryId: categoryId ?? prev.categoryId,
        vendorId: vendorId ?? prev.vendorId,
        dateFrom: dateFrom ?? prev.dateFrom,
        dateTo: dateTo ?? prev.dateTo,
      }));
    }
  }, [searchParams]);

  // Open product dialog from URL (e.g. mobile redirect from /products/new or /products/[id]/edit)
  const addParam = searchParams.get("add");
  const editIdFromUrl = searchParams.get("edit");
  const { data: productToEditFromUrl } = useProduct(editIdFromUrl || "");

  useEffect(() => {
    if (addParam === "1") {
      setEditingProduct(null);
      setProductVariations([]);
      setProductDiscounts([]);
      setProductAttributeTypeIds([]);
      productForm.reset();
      setProductDialog(true);
      router.replace(`${basePath}/products`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam, basePath, router]);

  const appliedEditFromUrl = useRef(false);
  useEffect(() => {
    if (!editIdFromUrl || !productToEditFromUrl || appliedEditFromUrl.current)
      return;
    appliedEditFromUrl.current = true;
    const product = productToEditFromUrl;
    setEditingProduct(product);
    productForm.values.name = product.name;
    productForm.values.categoryId = product.categoryId;
    productForm.values.description = product.description || "";
    productForm.values.length = product.length?.toString() || "";
    productForm.values.breadth = product.breadth?.toString() || "";
    productForm.values.height = product.height?.toString() || "";
    productForm.values.weight = product.weight?.toString() || "";
    productForm.values.costPrice = product.costPrice.toString();
    productForm.values.mrp = product.mrp.toString();
    if (product.variations?.length) {
      setProductVariations(
        product.variations.map((v) => ({
          id: v.id,
          stockQuantity: (v.stockQuantity || 0).toString(),
          subVariants: (v.subVariations || []).map((s) => s.name),
          photos: (v.photos || []).map((p) => ({
            photoUrl: p.photoUrl,
            isPrimary: p.isPrimary || false,
          })),
          attributes:
            (
              v as {
                attributes?: Array<{
                  attributeTypeId?: string;
                  attributeValueId?: string;
                  attributeType?: { id: string };
                  attributeValue?: { id: string };
                }>;
              }
            ).attributes
              ?.map((a) => ({
                attributeTypeId: a.attributeTypeId ?? a.attributeType?.id ?? "",
                attributeValueId:
                  a.attributeValueId ?? a.attributeValue?.id ?? "",
              }))
              .filter((a) => a.attributeTypeId && a.attributeValueId) ??
            undefined,
        })),
      );
    } else {
      setProductVariations([]);
    }
    const pat = (
      product as {
        productAttributeTypes?: Array<{ attributeType: { id: string } }>;
      }
    ).productAttributeTypes;
    setProductAttributeTypeIds(pat?.map((p) => p.attributeType.id) ?? []);
    if (product.discounts?.length) {
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
    router.replace(`${basePath}/products`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, productToEditFromUrl, basePath, router]);

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

  const handleLowStockChange = useCallback((checked: boolean) => {
    setPaginationParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      lowStock: checked ? true : undefined,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setPaginationParams({
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
      lowStock: undefined,
    });
  }, []);

  const hasActiveFilters =
    (paginationParams.search ?? "") !== "" ||
    paginationParams.locationId != null ||
    paginationParams.categoryId != null ||
    paginationParams.subCategory != null ||
    paginationParams.vendorId != null ||
    paginationParams.dateFrom != null ||
    paginationParams.dateTo != null ||
    paginationParams.lowStock === true ||
    (paginationParams.sortBy ?? "dateCreated") !== "dateCreated" ||
    (paginationParams.sortOrder ?? "desc") !== "desc";

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const deleteVariationMutation = useDeleteVariation();
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageProducts = isAdmin;
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
  // Default location for new product stock (when adding product)
  const [defaultLocationIdForCreate, setDefaultLocationIdForCreate] = useState<
    string | undefined
  >(undefined);

  // Form states
  const [productVariations, setProductVariations] = useState<
    ProductVariationForm[]
  >([]);
  const [productDiscounts, setProductDiscounts] = useState<
    ProductDiscountForm[]
  >([]);
  const [productAttributeTypeIds, setProductAttributeTypeIds] = useState<
    string[]
  >([]);

  // Fetch discount types using React Query (cached, no duplicate calls)
  const { data: discountTypes = [] } = useDiscountTypes();
  const { data: attributeTypes = [] } = useAttributeTypes();

  // Validation functions
  const validateProduct = (values: ProductFormValues) => {
    const errors: Record<string, string> = {};

    if (!(values.imsCode ?? "").trim())
      errors.imsCode = "IMS code (barcode) is required";
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
        // Additional validation before submission
        if (!values.name?.trim() || !values.categoryId) {
          setErrorDialog({
            open: true,
            title: "Validation Error",
            message: "Please fill in all required fields (Name and Category).",
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

        if (productAttributeTypeIds.length > 0) {
          const variationWithoutAttribute = productVariations.find(
            (v) => !v.attributes?.length || v.attributes.length === 0,
          );
          if (variationWithoutAttribute) {
            setErrorDialog({
              open: true,
              title: "Validation Error",
              message: "A variation must have at least one attribute selected.",
            });
            return;
          }
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
          imsCode: (values.imsCode ?? "").trim(),
          name: values.name,
          categoryId: values.categoryId,
          subCategory: values.subCategory || undefined,
          description: values.description,
          length: values.length ? Number(values.length) : undefined,
          breadth: values.breadth ? Number(values.breadth) : undefined,
          height: values.height ? Number(values.height) : undefined,
          weight: values.weight ? Number(values.weight) : undefined,
          costPrice: costPrice,
          mrp: mrp,
          vendorId: values.vendorId || undefined,
        };

        if (productAttributeTypeIds.length > 0) {
          data.attributeTypeIds = productAttributeTypeIds;
        }
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
              attributes:
                v.attributes && v.attributes.length > 0
                  ? v.attributes
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
          if (defaultLocationIdForCreate) {
            data.defaultLocationId = defaultLocationIdForCreate;
          }
          await createProductMutation.mutateAsync(data);
          toast({ title: "Product added successfully" });
        }
        setProductDialog(false);
        setEditingProduct(null);
        setDefaultLocationIdForCreate(undefined);
        setProductVariations([]);
        setProductDiscounts([]);
        setProductAttributeTypeIds([]);
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
    productForm.setValues({
      imsCode: product.imsCode ?? "",
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
      const activeLocationId = paginationParams.locationId;
      setProductVariations(
        product.variations.map((v) => {
          const inv = v.locationInventory ?? [];
          // When a specific location is selected, use that location's stock.
          // Otherwise use the first (or only) location inventory entry.
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

    const pat = (
      product as {
        productAttributeTypes?: Array<{ attributeType: { id: string } }>;
      }
    ).productAttributeTypes;
    setProductAttributeTypeIds(pat?.map((p) => p.attributeType.id) ?? []);

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
    setProductAttributeTypeIds([]);
    productForm.reset();
  };

  // Variation handlers
  const addVariationToForm = () => {
    if (productAttributeTypeIds.length === 0) {
      toast({
        title: "Select attribute types first",
        description:
          "Select at least one attribute type for the product (e.g. Color, Size) before adding a variation.",
        variant: "destructive",
      });
      return;
    }
    setProductVariations([
      ...productVariations,
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
      ...variation,
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
    updated[variationIndex] = { ...variation, photos: newPhotos };
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
      ...variation,
      photos,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground mt-2">
          Manage products, categories, and variations
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
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
                    attributeTypes={attributeTypes}
                    productAttributeTypeIds={productAttributeTypeIds}
                    onProductAttributeTypeIdsChange={setProductAttributeTypeIds}
                    defaultLocationId={defaultLocationIdForCreate}
                    onDefaultLocationChange={setDefaultLocationIdForCreate}
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
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <ProductTable
          products={products}
          categories={categories}
          canSeeCostPrice={canSeeCostPrice}
          canManageProducts={canManageProducts}
          sortBy={paginationParams.sortBy ?? "dateCreated"}
          sortOrder={paginationParams.sortOrder ?? "desc"}
          onSort={handleSortChange}
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
                className="h-9 w-[130px] text-sm"
              />
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
                <SelectTrigger className="h-9 w-[200px] shrink-0 gap-2 text-sm">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateCreated-desc">
                    Date (newest first)
                  </SelectItem>
                  <SelectItem value="dateCreated-asc">
                    Date (oldest first)
                  </SelectItem>
                  <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                  <SelectItem value="mrp-desc">MRP (high–low)</SelectItem>
                  <SelectItem value="mrp-asc">MRP (low–high)</SelectItem>
                  <SelectItem value="costPrice-desc">
                    Cost (high–low)
                  </SelectItem>
                  <SelectItem value="costPrice-asc">Cost (low–high)</SelectItem>
                  <SelectItem value="vendorname-asc">Vendor (A–Z)</SelectItem>
                  <SelectItem value="vendorname-desc">Vendor (Z–A)</SelectItem>
                </SelectContent>
              </Select>
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
                <PopoverContent
                  className="w-[min(90vw,380px)] max-h-[min(85vh,440px)] overflow-y-auto p-3"
                  align="end"
                  side="bottom"
                  sideOffset={4}
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="col-span-2 flex items-center space-x-2">
                      <Checkbox
                        id="lowStock"
                        checked={paginationParams.lowStock === true}
                        onCheckedChange={(c) =>
                          handleLowStockChange(c === true)
                        }
                      />
                      <Label
                        htmlFor="lowStock"
                        className="text-xs font-medium cursor-pointer"
                      >
                        Low stock only (quantity &lt; 5)
                      </Label>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground col-span-2">
                      Category & vendor
                    </p>
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
                    <div className="col-span-2 space-y-1">
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
                    <p className="text-xs font-medium text-muted-foreground col-span-2 pt-1">
                      Date range
                    </p>
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
                </PopoverContent>
              </Popover>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={clearAllFilters}
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  Clear filters
                </Button>
              )}
            </>
          }
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
      </div>

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
