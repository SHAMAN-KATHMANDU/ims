"use client"

import { useState } from "react"
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
  type Product,
  type Category,
  type ProductVariation,
} from "@/hooks/useProduct"

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

type VariationFormValues = {
  productId: string
  color: string
  stockQuantity: string
}

export function ProductPage() {
  // ============================================
  // HOOKS - Connect your data here
  // ============================================
  const { products, addProduct, updateProduct, deleteProduct } = useProducts()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const { variations, addVariation, updateVariation, deleteVariation } = useVariations()
  const { toast } = useToast()

  // Dialog states
  const [productDialog, setProductDialog] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [variationDialog, setVariationDialog] = useState(false)

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null)

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

  const validateVariation = (values: VariationFormValues) => {
    const errors: Record<string, string> = {}
    if (!values.productId) errors.productId = "Product is required"
    if (!values.color?.trim()) errors.color = "Color is required"
    if (!values.stockQuantity || Number(values.stockQuantity) < 0)
      errors.stockQuantity = "Valid stock quantity is required"
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
      const data = {
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

      if (editingProduct) {
        await updateProduct(editingProduct.id, data)
        toast({ title: "Product updated successfully" })
      } else {
        await addProduct(data)
        toast({ title: "Product added successfully" })
      }
      setProductDialog(false)
      setEditingProduct(null)
      productForm.reset()
    },
  })

  const categoryForm = useForm<CategoryFormValues>({
    initialValues: { name: "", description: "" },
    validate: validateCategory,
    onSubmit: async (values) => {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values)
        toast({ title: "Category updated successfully" })
      } else {
        await addCategory(values)
        toast({ title: "Category added successfully" })
      }
      setCategoryDialog(false)
      setEditingCategory(null)
      categoryForm.reset()
    },
  })

  const variationForm = useForm<VariationFormValues>({
    initialValues: { productId: "", color: "", stockQuantity: "" },
    validate: validateVariation,
    onSubmit: async (values) => {
      const data = {
        productId: values.productId,
        color: values.color,
        stockQuantity: Number(values.stockQuantity),
      }

      if (editingVariation) {
        await updateVariation(editingVariation.id, data)
        toast({ title: "Variation updated successfully" })
      } else {
        await addVariation(data)
        toast({ title: "Variation added successfully" })
      }
      setVariationDialog(false)
      setEditingVariation(null)
      variationForm.reset()
    },
  })

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown"
  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || "Unknown"

  const handleEditProduct = (product: Product) => {
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
    setProductDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.values.name = category.name
    categoryForm.values.description = category.description || ""
    setCategoryDialog(true)
  }

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation)
    variationForm.values.productId = variation.productId
    variationForm.values.color = variation.color
    variationForm.values.stockQuantity = variation.stockQuantity.toString()
    setVariationDialog(true)
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
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Product Catalog</h2>
            <Dialog open={productDialog} onOpenChange={setProductDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingProduct(null)
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
                  {productForm.errors._form && <p className="text-sm text-destructive">{productForm.errors._form}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProductDialog(false)
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
                      <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                      <TableCell>Rs. {product.costPrice}</TableCell>
                      <TableCell>Rs. {product.mrp}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            deleteProduct(product.id)
                            toast({ title: "Product deleted" })
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            deleteCategory(category.id)
                            toast({ title: "Category deleted" })
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VARIATIONS TAB */}
        <TabsContent value="variations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Variations</h2>
            <Dialog open={variationDialog} onOpenChange={setVariationDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingVariation(null)
                    variationForm.reset()
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Variation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingVariation ? "Edit Variation" : "Add Variation"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={variationForm.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="var-productId">Product</Label>
                    <Select
                      value={variationForm.values.productId}
                      onValueChange={(value) => variationForm.handleChange("productId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {variationForm.errors.productId && (
                      <p className="text-sm text-destructive">{variationForm.errors.productId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="var-color">Color</Label>
                    <Input
                      id="var-color"
                      value={variationForm.values.color}
                      onChange={(e) => variationForm.handleChange("color", e.target.value)}
                    />
                    {variationForm.errors.color && (
                      <p className="text-sm text-destructive">{variationForm.errors.color}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="var-stock">Stock Quantity</Label>
                    <Input
                      id="var-stock"
                      type="number"
                      value={variationForm.values.stockQuantity}
                      onChange={(e) => variationForm.handleChange("stockQuantity", e.target.value)}
                    />
                    {variationForm.errors.stockQuantity && (
                      <p className="text-sm text-destructive">{variationForm.errors.stockQuantity}</p>
                    )}
                  </div>
                  {variationForm.errors._form && (
                    <p className="text-sm text-destructive">{variationForm.errors._form}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setVariationDialog(false)
                        variationForm.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={variationForm.isLoading}>
                      {variationForm.isLoading ? "Saving..." : editingVariation ? "Update" : "Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Variations</CardTitle>
              <CardDescription>Total: {variations.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No variations yet. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    variations.map((variation) => (
                      <TableRow key={variation.id}>
                        <TableCell className="font-medium">{getProductName(variation.productId)}</TableCell>
                        <TableCell>{variation.color}</TableCell>
                        <TableCell>{variation.stockQuantity}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditVariation(variation)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteVariation(variation.id)
                              toast({ title: "Variation deleted" })
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
