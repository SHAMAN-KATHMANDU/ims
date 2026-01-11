"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Edit2, Trash2 } from "lucide-react"
import { getTotalStock, getDiscountedPrices, getCategoryName, calculateDiscountedPrice } from "../utils/helpers"
import type { Product, Category } from "@/hooks/useProduct"

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  canSeeCostPrice: boolean
  canManageProducts: boolean
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({
  products,
  categories,
  canSeeCostPrice,
  canManageProducts,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    const categoryName = getCategoryName(product.categoryId, product, categories).toLowerCase()
    
    return (
      product.imsCode?.toLowerCase().includes(query) ||
      product.name?.toLowerCase().includes(query) ||
      categoryName.includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.costPrice?.toString().includes(query) ||
      product.mrp?.toString().includes(query)
    )
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>All Products</CardTitle>
            <CardDescription>
              {searchQuery 
                ? `Showing ${filteredProducts.length} of ${products.length} products`
                : `Total: ${products.length} products`
              }
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IMS Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              {canSeeCostPrice && <TableHead>Cost Price</TableHead>}
              <TableHead>MRP</TableHead>
              {!canSeeCostPrice && (
                <>
                  <TableHead>General Price</TableHead>
                  <TableHead>Special Price</TableHead>
                  <TableHead>Member Price</TableHead>
                  <TableHead>Wholesale Price</TableHead>
                </>
              )}
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canSeeCostPrice ? 7 : 10} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No products found matching your search." : "No products found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const totalStock = getTotalStock(product)
                const discountedPrices = !canSeeCostPrice ? getDiscountedPrices(product) : {}
                const hasVariations = product.variations && product.variations.length > 0
                const isExpanded = expandedProductId === product.id
                const productDiscounts = product.discounts || []

                return (
                  <>
                    <TableRow 
                      key={product.id}
                      className={hasVariations ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={hasVariations ? () => {
                        setExpandedProductId(isExpanded ? null : product.id)
                      } : undefined}
                    >
                      <TableCell className="font-mono">{product.imsCode}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.categoryId, product, categories)}</TableCell>
                      {canSeeCostPrice && (
                        <TableCell>Rs. {product.costPrice}</TableCell>
                      )}
                      <TableCell>Rs. {product.mrp}</TableCell>
                      {!canSeeCostPrice && (
                        <>
                          <TableCell>
                            {discountedPrices.general ? (
                              <div>
                                <div className="font-medium">Rs. {discountedPrices.general.price.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.general.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.special ? (
                              <div>
                                <div className="font-medium">Rs. {discountedPrices.special.price.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.special.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.member ? (
                              <div>
                                <div className="font-medium">Rs. {discountedPrices.member.price.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.member.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.wholesale ? (
                              <div>
                                <div className="font-medium">Rs. {discountedPrices.wholesale.price.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.wholesale.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <span className="font-medium">{totalStock}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {canManageProducts ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(product)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {hasVariations && isExpanded && (
                      <TableRow>
                        <TableCell colSpan={canSeeCostPrice ? 7 : 10} className="p-4 bg-muted/30">
                          <div className="space-y-4">
                            {/* Discounts Section */}
                            {productDiscounts.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold">Available Discounts:</div>
                                <div className="flex flex-wrap gap-2">
                                  {productDiscounts
                                    .filter(d => d.isActive)
                                    .map((discount) => {
                                      const discountPrice = calculateDiscountedPrice(product.mrp, discount.discountPercentage)
                                      return (
                                        <div key={discount.id} className="border rounded-lg p-2 bg-background">
                                          <div className="text-xs font-medium">
                                            {discount.discountType?.name || "Unknown"}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {discount.discountPercentage}% off - Rs. {discountPrice.toFixed(2)}
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            )}
                            
                            {/* Variations Section */}
                            <div className="space-y-2">
                              <div className="text-sm font-semibold">Variations:</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {product.variations?.map((variation) => {
                                  const photos = variation.photos || []
                                  const primaryPhoto = photos.find(p => p.isPrimary) || photos[0]
                                  
                                  return (
                                    <div key={variation.id} className="border rounded-lg p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="font-medium text-sm">{variation.color}</div>
                                          <div className="text-xs text-muted-foreground">
                                            Stock: {variation.stockQuantity}
                                          </div>
                                        </div>
                                      </div>
                                      {primaryPhoto && (
                                        <div className="relative">
                                          <img
                                            src={primaryPhoto.photoUrl}
                                            alt={`${variation.color} variation`}
                                            className="w-full h-32 object-cover rounded border"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E"
                                            }}
                                          />
                                          {photos.length > 1 && (
                                            <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                              {photos.length}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {photos.length === 0 && (
                                        <div className="w-full h-32 bg-muted rounded border flex items-center justify-center">
                                          <span className="text-xs text-muted-foreground">No photos</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

