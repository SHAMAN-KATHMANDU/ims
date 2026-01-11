"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "@/hooks/useForm"
import {
  useProducts,
  useCategories,
  useVariations,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Product,
  type Category,
  type ProductVariation,
} from "@/hooks/useProduct"
import { getUserRole, isAdmin } from "@/utils/auth"
import { useAxios } from "@/hooks/useAxios"
import { ProductService } from "@/services/productService"


type ProductFormValues = {
  imsCode: string
  name: string
  categoryId: string
  description: string
  length: string
  breadth: string
  height: string
  weight: string
  costPrice: string
  mrp: string
}

type CategoryFormValues = {
  name: string
  description: string
}


export function ProductPage() {
  // ============================================
  // HOOKS - Connect your data here
  // ============================================
  const { data: products = [], isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useProducts()
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useCategories()
  const createProductMutation = useCreateProduct()
  const updateProductMutation = useUpdateProduct()
  const deleteProductMutation = useDeleteProduct()
  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const { toast } = useToast()
  const userRole = getUserRole()
  const canManageProducts = isAdmin() // admin and superAdmin can manage products
  const axios = useAxios() // Get axios instance at component level

  // Dialog states
  const [productDialog, setProductDialog] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState(false)

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Variations state for product form
  const [productVariations, setProductVariations] = useState<Array<{ 
    color: string
    stockQuantity: string
    photos: Array<{ photoUrl: string; isPrimary: boolean }>
  }>>([])
  
  // Discounts state for product form
  const [productDiscounts, setProductDiscounts] = useState<Array<{
    discountTypeName: string
    discountPercentage: string
    startDate: string
    endDate: string
    isActive: boolean
  }>>([])
  
  // Discount types state
  const [discountTypes, setDiscountTypes] = useState<Array<{ id: string; name: string }>>([])
  
  // Helper to get all variations from all products for display
  const allVariations = products.flatMap((product: Product) => 
    (product.variations || []).map(v => ({ ...v, productName: product.name }))
  )
  
  // Helper to get all discounts from all products for display
  const allDiscounts = products.flatMap((product: Product) => 
    (product.discounts || []).map((d) => ({ 
      ...d, 
      productName: product.name,
      productId: product.id
    }))
  )
  // Fetch discount types using ProductService
  useEffect(() => {
    const fetchDiscountTypes = async () => {
      try {
        const productService = new ProductService(axios)
        const types = await productService.getAllDiscountTypes()
        setDiscountTypes(types)
      } catch (error) {
        console.error("Error fetching discount types:", error)
      }
    }
    fetchDiscountTypes()
  }, [axios])

  // ============================================
  // ============================================

  const validateProduct = (values: ProductFormValues) => {
    const errors: Record<string, string> = {}
    if (!values.imsCode?.trim()) errors.imsCode = "IMS Code is required"
    if (!values.name?.trim()) errors.name = "Product name is required"
    if (!values.categoryId) errors.categoryId = "Category is required"
    if (!values.costPrice || Number(values.costPrice) <= 0) errors.costPrice = "Valid cost price is required"
    if (!values.mrp || Number(values.mrp) <= 0) errors.mrp = "Valid MRP is required"
    return Object.keys(errors).length > 0 ? errors : null
  }

  const validateCategory = (values: CategoryFormValues) => {
    const errors: Record<string, string> = {}
    if (!values.name?.trim()) errors.name = "Category name is required"
    return Object.keys(errors).length > 0 ? errors : null
  }


  // ============================================
  // ============================================

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
        const isEditing = !!editingProduct
        
        const data: any = {
          imsCode: values.imsCode,
          name: values.name,
          categoryId: values.categoryId,
          description: values.description,
          length: values.length ? Number(values.length) : undefined,
          breadth: values.breadth ? Number(values.breadth) : undefined,
          height: values.height ? Number(values.height) : undefined,
          weight: values.weight ? Number(values.weight) : undefined,
          costPrice: Number(values.costPrice),
          mrp: Number(values.mrp),
        }

        // Always include variations when editing (even if empty, to clear existing ones)
        // When creating, only include if there are variations
        if (isEditing) {
          // When editing, always send variations array (even if empty) so backend can update/clear them
          data.variations = productVariations.map(v => ({
            color: v.color,
            stockQuantity: Number(v.stockQuantity) || 0,
            photos: v.photos && v.photos.length > 0 ? v.photos.map(p => ({
              photoUrl: p.photoUrl,
              isPrimary: p.isPrimary
            })) : undefined,
          }))
          
          // Always send discounts array when editing (even if empty) so backend can update/clear them
          data.discounts = productDiscounts.map(d => ({
            discountTypeName: d.discountTypeName,
            discountPercentage: Number(d.discountPercentage) || 0,
            startDate: d.startDate && d.startDate.trim() !== "" ? d.startDate : undefined,
            endDate: d.endDate && d.endDate.trim() !== "" ? d.endDate : undefined,
            isActive: d.isActive
          }))
        } else {
          // When creating, only include if there are variations/discounts
          if (productVariations.length > 0) {
            data.variations = productVariations.map(v => ({
              color: v.color,
              stockQuantity: Number(v.stockQuantity) || 0,
              photos: v.photos && v.photos.length > 0 ? v.photos.map(p => ({
                photoUrl: p.photoUrl,
                isPrimary: p.isPrimary
              })) : undefined,
            }))
          }
          
          if (productDiscounts.length > 0) {
            data.discounts = productDiscounts.map(d => ({
              discountTypeName: d.discountTypeName,
              discountPercentage: Number(d.discountPercentage) || 0,
              startDate: d.startDate && d.startDate.trim() !== "" ? d.startDate : undefined,
              endDate: d.endDate && d.endDate.trim() !== "" ? d.endDate : undefined,
              isActive: d.isActive
            }))
          }
        }

        if (isEditing) {
          if (!editingProduct?.id) {
            throw new Error("Product ID is missing. Please try editing the product again.")
          }
          console.log(`Updating product with ID: ${editingProduct.id}`, data);
          await updateProductMutation.mutateAsync({ id: editingProduct.id, data })
          toast({ title: "Product updated successfully" })
        } else {
          await createProductMutation.mutateAsync(data)
          toast({ title: "Product added successfully" })
        }
        // Remove: await refreshProducts() - not needed, auto-refetches on success
        setProductDialog(false)
        setEditingProduct(null)
        setProductVariations([])
        setProductDiscounts([])
        productForm.reset()
      } catch (error: any) {
        console.error("Product save error:", error);
        const errorMessage = error.response?.data?.message || error.message || "Failed to save product";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    },
  })

  const categoryForm = useForm<CategoryFormValues>({
    initialValues: { name: "", description: "" },
    validate: validateCategory,
    onSubmit: async (values) => {
      try {
        if (editingCategory) {
          await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data: values })
          toast({ title: "Category updated successfully" })
        } else {
          await createCategoryMutation.mutateAsync(values)
          toast({ title: "Category added successfully" })
        }
        // Remove: await refreshCategories() - not needed, auto-refetches on success
        setCategoryDialog(false)
        setEditingCategory(null)
        categoryForm.reset()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save category",
          variant: "destructive",
        })
      }
    },
  })


  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getCategoryName = (id: string, product?: Product) => {
    // First check if product has category object
    if (product?.category?.name) {
      return product.category.name
    }
    // Fallback to categories list
    return categories.find((c) => c.id === id)?.name || "Unknown"
  }
  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || "Unknown"

  const handleEditProduct = (product: Product) => {
    if (!product || !product.id) {
      toast({
        title: "Error",
        description: "Invalid product data. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }
    
    console.log(`Editing product: ${product.name} (ID: ${product.id})`)
    setEditingProduct(product)
    productForm.values.imsCode = product.imsCode
    productForm.values.name = product.name
    productForm.values.categoryId = product.categoryId
    productForm.values.description = product.description || ""
    productForm.values.length = product.length?.toString() || ""
    productForm.values.breadth = product.breadth?.toString() || ""
    productForm.values.height = product.height?.toString() || ""
    productForm.values.weight = product.weight?.toString() || ""
    productForm.values.costPrice = product.costPrice.toString()
    productForm.values.mrp = product.mrp.toString()
    // Load existing variations
    if (product.variations && product.variations.length > 0) {
      setProductVariations(
        product.variations.map(v => ({
          color: v.color || "",
          stockQuantity: (v.stockQuantity || 0).toString(),
          photos: (v.photos || []).map(p => ({
            photoUrl: p.photoUrl,
            isPrimary: p.isPrimary || false
          }))
        }))
      )
    } else {
      setProductVariations([])
    }
    
    // Load existing discounts
    if ((product as any).discounts && (product as any).discounts.length > 0) {
      setProductDiscounts(
        (product as any).discounts.map((d: any) => ({
          discountTypeName: d.discountType?.name || "",
          discountPercentage: (d.discountPercentage || 0).toString(),
          startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : "",
          endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : "",
          isActive: d.isActive !== undefined ? d.isActive : true
        }))
      )
    } else {
      setProductDiscounts([])
    }
    
    setProductDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.values.name = category.name
    categoryForm.values.description = category.description || ""
    setCategoryDialog(true)
  }

  const addVariationToForm = () => {
    setProductVariations([...productVariations, { color: "", stockQuantity: "0", photos: [] }])
  }

  const removeVariationFromForm = (index: number) => {
    setProductVariations(productVariations.filter((_, i) => i !== index))
  }

  const updateVariationInForm = (index: number, field: "color" | "stockQuantity", value: string) => {
    const updated = [...productVariations]
    updated[index] = { 
      color: field === "color" ? value : (updated[index]?.color || ""),
      stockQuantity: field === "stockQuantity" ? value : (updated[index]?.stockQuantity || "0"),
      photos: updated[index]?.photos || []
    }
    setProductVariations(updated)
  }

  const addPhotoToVariation = (variationIndex: number, photoUrl: string) => {
    const updated = [...productVariations]
    const variation = updated[variationIndex]
    if (!variation) return
    
    const photos = variation.photos || []
    // If this is the first photo, make it primary
    const isPrimary = photos.length === 0
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: [...photos, { photoUrl, isPrimary }]
    }
    setProductVariations(updated)
  }

  const removePhotoFromVariation = (variationIndex: number, photoIndex: number) => {
    const updated = [...productVariations]
    const variation = updated[variationIndex]
    if (!variation) return
    
    const photos = variation.photos || []
    const newPhotos = photos.filter((_, i) => i !== photoIndex)
    // If we removed the primary photo and there are other photos, make the first one primary
    if (photos[photoIndex]?.isPrimary && newPhotos.length > 0 && newPhotos[0]) {
      newPhotos[0].isPrimary = true
    }
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: newPhotos
    }
    setProductVariations(updated)
  }

  const setPrimaryPhoto = (variationIndex: number, photoIndex: number) => {
    const updated = [...productVariations]
    const variation = updated[variationIndex]
    if (!variation) return
    
    const photos = [...(variation.photos || [])]
    photos.forEach((photo, i) => {
      photo.isPrimary = i === photoIndex
    })
    updated[variationIndex] = {
      color: variation.color || "",
      stockQuantity: variation.stockQuantity || "0",
      photos: photos
    }
    setProductVariations(updated)
  }

  const addDiscountToForm = () => {
    setProductDiscounts([...productDiscounts, { discountTypeName: "", discountPercentage: "0", startDate: "", endDate: "", isActive: true }])
  }

  const removeDiscountFromForm = (index: number) => {
    setProductDiscounts(productDiscounts.filter((_, i) => i !== index))
  }

  const updateDiscountInForm = (index: number, field: "discountTypeName" | "discountPercentage" | "startDate" | "endDate" | "isActive", value: string | boolean) => {
    const updated = [...productDiscounts]
    updated[index] = {
      discountTypeName: field === "discountTypeName" ? (value as string) : (updated[index]?.discountTypeName || ""),
      discountPercentage: field === "discountPercentage" ? (value as string) : (updated[index]?.discountPercentage || "0"),
      startDate: field === "startDate" ? (value as string) : (updated[index]?.startDate || ""),
      endDate: field === "endDate" ? (value as string) : (updated[index]?.endDate || ""),
      isActive: field === "isActive" ? (value as boolean) : (updated[index]?.isActive !== undefined ? updated[index].isActive : true)
    }
    setProductDiscounts(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground mt-2">Manage products, categories, and variations</p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Product Catalog</h2>
            {canManageProducts && (
              <Dialog open={productDialog} onOpenChange={setProductDialog}>
                <DialogTrigger asChild>
                  <Button
                  onClick={() => {
                    setEditingProduct(null)
                    setProductVariations([])
                    setProductDiscounts([])
                    productForm.reset()
                  }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Product
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={productForm.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imsCode">IMS Code</Label>
                    <Input
                      id="imsCode"
                      value={productForm.values.imsCode}
                      onChange={(e) => productForm.handleChange("imsCode", e.target.value)}
                    />
                    {productForm.errors.imsCode && (
                      <p className="text-sm text-destructive">{productForm.errors.imsCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={productForm.values.name}
                      onChange={(e) => productForm.handleChange("name", e.target.value)}
                    />
                    {productForm.errors.name && <p className="text-sm text-destructive">{productForm.errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select
                      value={productForm.values.categoryId}
                      onValueChange={(value) => productForm.handleChange("categoryId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {productForm.errors.categoryId && (
                      <p className="text-sm text-destructive">{productForm.errors.categoryId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={productForm.values.description}
                      onChange={(e) => productForm.handleChange("description", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length (cm)</Label>
                      <Input
                        id="length"
                        type="number"
                        value={productForm.values.length}
                        onChange={(e) => productForm.handleChange("length", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breadth">Breadth (cm)</Label>
                      <Input
                        id="breadth"
                        type="number"
                        value={productForm.values.breadth}
                        onChange={(e) => productForm.handleChange("breadth", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={productForm.values.height}
                        onChange={(e) => productForm.handleChange("height", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        value={productForm.values.weight}
                        onChange={(e) => productForm.handleChange("weight", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        value={productForm.values.costPrice}
                        onChange={(e) => productForm.handleChange("costPrice", e.target.value)}
                      />
                      {productForm.errors.costPrice && (
                        <p className="text-sm text-destructive">{productForm.errors.costPrice}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mrp">MRP</Label>
                      <Input
                        id="mrp"
                        type="number"
                        value={productForm.values.mrp}
                        onChange={(e) => productForm.handleChange("mrp", e.target.value)}
                      />
                      {productForm.errors.mrp && <p className="text-sm text-destructive">{productForm.errors.mrp}</p>}
                    </div>
                  </div>
                  
                  {/* Variations Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Variations (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariationToForm}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Variation
                      </Button>
                    </div>
                    {productVariations.length > 0 && (
                      <div className="space-y-4 border rounded-lg p-4">
                        {productVariations.map((variation, index) => (
                          <div key={index} className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0">
                            <div className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <Label htmlFor={`var-color-${index}`} className="text-xs">Color</Label>
                                <Input
                                  id={`var-color-${index}`}
                                  placeholder="e.g., Red, Blue"
                                  value={variation.color}
                                  onChange={(e) => updateVariationInForm(index, "color", e.target.value)}
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label htmlFor={`var-stock-${index}`} className="text-xs">Stock Quantity</Label>
                                <Input
                                  id={`var-stock-${index}`}
                                  type="number"
                                  placeholder="0"
                                  value={variation.stockQuantity}
                                  onChange={(e) => updateVariationInForm(index, "stockQuantity", e.target.value)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeVariationFromForm(index)}
                                className="mb-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            
                            {/* Photos Section for this variation */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Label className="text-xs">Photos (Optional)</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const photoUrl = prompt("Enter photo URL:")
                                    if (photoUrl && photoUrl.trim()) {
                                      addPhotoToVariation(index, photoUrl.trim())
                                    }
                                  }}
                                  className="h-7 text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Photo
                                </Button>
                              </div>
                              {variation.photos && variation.photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {variation.photos.map((photo, photoIndex) => (
                                    <div key={photoIndex} className="relative group">
                                      <img
                                        src={photo.photoUrl}
                                        alt={`Variation ${index + 1} photo ${photoIndex + 1}`}
                                        className="h-20 w-full rounded border object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EInvalid%3C/text%3E%3C/svg%3E"
                                        }}
                                      />
                                      {photo.isPrimary && (
                                        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                                          Primary
                                        </span>
                                      )}
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        {!photo.isPrimary && (
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setPrimaryPhoto(index, photoIndex)}
                                            className="h-6 text-xs"
                                          >
                                            Set Primary
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => removePhotoFromVariation(index, photoIndex)}
                                          className="h-6 text-xs"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Add color variations and stock quantities for this product
                    </p>
                  </div>
                  
                  {/* Discounts Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Discounts (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDiscountToForm}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Discount
                      </Button>
                    </div>
                    {productDiscounts.length > 0 && (
                      <div className="space-y-4 border rounded-lg p-4">
                        {productDiscounts.map((discount, index) => (
                          <div key={index} className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`disc-type-${index}`} className="text-xs">Discount Type *</Label>
                                <Select
                                  value={discount.discountTypeName}
                                  onValueChange={(value) => updateDiscountInForm(index, "discountTypeName", value)}
                                >
                                  <SelectTrigger id={`disc-type-${index}`}>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {discountTypes.length > 0 ? (
                                      discountTypes.map((dt) => (
                                        <SelectItem key={dt.id} value={dt.name}>
                                          {dt.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="Special">Special</SelectItem>
                                        <SelectItem value="Member">Member</SelectItem>
                                        <SelectItem value="Wholesale">Wholesale</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`disc-percent-${index}`} className="text-xs">Discount % *</Label>
                                <Input
                                  id={`disc-percent-${index}`}
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={discount.discountPercentage}
                                  onChange={(e) => updateDiscountInForm(index, "discountPercentage", e.target.value)}
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="flex-1 flex items-center gap-2 space-y-1">
                                  <input
                                    id={`disc-active-${index}`}
                                    type="checkbox"
                                    checked={discount.isActive}
                                    onChange={(e) => updateDiscountInForm(index, "isActive", e.target.checked)}
                                    className="h-4 w-4"
                                    aria-label="Active discount"
                                  />
                                  <Label htmlFor={`disc-active-${index}`} className="text-xs cursor-pointer">Active</Label>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDiscountFromForm(index)}
                                  className="mb-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`disc-start-${index}`} className="text-xs">Start Date (Optional)</Label>
                                <Input
                                  id={`disc-start-${index}`}
                                  type="date"
                                  value={discount.startDate}
                                  onChange={(e) => updateDiscountInForm(index, "startDate", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`disc-end-${index}`} className="text-xs">End Date (Optional)</Label>
                                <Input
                                  id={`disc-end-${index}`}
                                  type="date"
                                  value={discount.endDate}
                                  min={discount.startDate || undefined}
                                  onChange={(e) => updateDiscountInForm(index, "endDate", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Add discount types and percentages for this product
                    </p>
                  </div>
                  
                  {productForm.errors._form && <p className="text-sm text-destructive">{productForm.errors._form}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProductDialog(false)
                        setProductVariations([])
                        setProductDiscounts([])
                        productForm.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={productForm.isLoading}>
                      {productForm.isLoading ? "Saving..." : editingProduct ? "Update" : "Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
              <CardDescription>Total: {products.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMS Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.imsCode}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.categoryId, product)}</TableCell>
                      <TableCell>Rs. {product.costPrice}</TableCell>
                      <TableCell>Rs. {product.mrp}</TableCell>
                      <TableCell className="text-right">
                        {canManageProducts ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  await deleteProductMutation.mutateAsync(product.id)
                                  // Remove: await refreshProducts() - not needed, auto-refetches on success
                                  toast({ title: "Product deleted" })
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Failed to delete product",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Categories</h2>
            {canManageProducts && (
              <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingCategory(null)
                      categoryForm.reset()
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Category
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={categoryForm.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Name</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.values.name}
                      onChange={(e) => categoryForm.handleChange("name", e.target.value)}
                    />
                    {categoryForm.errors.name && <p className="text-sm text-destructive">{categoryForm.errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-description">Description</Label>
                    <Textarea
                      id="cat-description"
                      value={categoryForm.values.description}
                      onChange={(e) => categoryForm.handleChange("description", e.target.value)}
                    />
                  </div>
                  {categoryForm.errors._form && <p className="text-sm text-destructive">{categoryForm.errors._form}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCategoryDialog(false)
                        categoryForm.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={categoryForm.isLoading}>
                      {categoryForm.isLoading ? "Saving..." : editingCategory ? "Update" : "Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

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
                    {canManageProducts && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                      {canManageProducts && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              try {
                                await deleteCategoryMutation.mutateAsync(category.id)
                                toast({ title: "Category deleted" })
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to delete category",
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VARIATIONS TAB - Read-only view */}
        <TabsContent value="variations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Product Variations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Variations are managed when creating or editing products. Edit a product to add or modify variations.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Variations</CardTitle>
              <CardDescription>
                Showing variations from all products. To add/edit variations, edit the product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Stock Quantity</TableHead>
                    <TableHead>Photos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allVariations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No variations found. Add variations when creating or editing a product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allVariations.map((variation) => {
                      const photos = variation.photos || []
                      const primaryPhoto = photos.find(p => p.isPrimary) || photos[0]
                      
                      return (
                        <TableRow key={variation.id}>
                          <TableCell className="font-medium">{(variation as any).productName}</TableCell>
                          <TableCell>{variation.color}</TableCell>
                          <TableCell>{variation.stockQuantity}</TableCell>
                          <TableCell>
                            {photos.length > 0 ? (
                              <div className="flex items-center gap-2">
                                {primaryPhoto && (
                                  <div className="relative">
                                    <img
                                      src={primaryPhoto.photoUrl}
                                      alt={`${variation.color} variation`}
                                      className="h-10 w-10 rounded object-cover border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23ddd' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3ENo Image%3C/text%3E%3C/svg%3E"
                                      }}
                                    />
                                    {photos.length > 1 && (
                                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {photos.length}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No photos</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISCOUNTS TAB - Read-only view */}
        <TabsContent value="discounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Product Discounts</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Discounts are managed when creating or editing products. Edit a product to add or modify discounts.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Discounts</CardTitle>
              <CardDescription>
                Showing discounts from all products. To add/edit discounts, edit the product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDiscounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No discounts found. Add discounts when creating or editing a product.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allDiscounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-medium">{(discount as any).productName}</TableCell>
                        <TableCell>
                          {discount.discountType?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="font-medium">{discount.discountPercentage}%</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            discount.isActive 
                              ? "bg-green-100 text-green-700" 
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {discount.startDate ? new Date(discount.startDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          {discount.endDate ? new Date(discount.endDate).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
