"use client"

import { useState, useEffect, useCallback } from "react"
import { useAxios } from "./useAxios"
import { ProductService, type Product, type Category, type ProductVariation, type CreateProductData, type UpdateProductData } from "@/services/productService"
import { CategoryService, type CreateCategoryData, type UpdateCategoryData } from "@/services/categoryService"

// Re-export types for convenience
export type { Product, Category, ProductVariation }

// ============================================
// HOOK: useProducts
// Uses ProductService for API calls
// ============================================

export function useProducts() {
  const axios = useAxios()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productService = new ProductService(axios)

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await productService.getAllProducts()
        setProducts(data)
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to fetch products")
        console.error("Error fetching products:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const addProduct = useCallback(async (data: CreateProductData) => {
    setIsLoading(true)
    setError(null)
    try {
      const newProduct = await productService.createProduct(data)
      setProducts((prev) => [...prev, newProduct])
      return newProduct
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create product"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [productService])

  const updateProduct = useCallback(async (id: string, data: UpdateProductData) => {
    setIsLoading(true)
    setError(null)
    try {
      const updatedProduct = await productService.updateProduct(id, data)
      setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)))
      return updatedProduct
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update product"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [productService])

  const deleteProduct = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await productService.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to delete product"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [productService])

  const refreshProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await productService.getAllProducts()
      setProducts(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to refresh products")
      console.error("Error refreshing products:", err)
    } finally {
      setIsLoading(false)
    }
  }, [productService])

  return { products, isLoading, error, addProduct, updateProduct, deleteProduct, refreshProducts }
}

// ============================================
// HOOK: useCategories
// ============================================

export function useCategories() {
  const axios = useAxios()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryService = new CategoryService(axios)

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await categoryService.getAllCategories()
        setCategories(data)
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to fetch categories")
        console.error("Error fetching categories:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const addCategory = useCallback(async (data: CreateCategoryData) => {
    setIsLoading(true)
    setError(null)
    try {
      const newCategory = await categoryService.createCategory(data)
      setCategories((prev) => [...prev, newCategory])
      return newCategory
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create category"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [categoryService])

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData) => {
    setIsLoading(true)
    setError(null)
    try {
      const updatedCategory = await categoryService.updateCategory(id, data)
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)))
      return updatedCategory
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update category"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [categoryService])

  const deleteCategory = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await categoryService.deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to delete category"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [categoryService])

  const refreshCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await categoryService.getAllCategories()
      setCategories(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to refresh categories")
      console.error("Error refreshing categories:", err)
    } finally {
      setIsLoading(false)
    }
  }, [categoryService])

  return { categories, isLoading, error, addCategory, updateCategory, deleteCategory, refreshCategories }
}

// ============================================
// HOOK: useVariations
// Note: Variations are part of products, not separate entities
// ============================================

export function useVariations() {
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Variations are managed through products
  // This hook is kept for backward compatibility
  const addVariation = async (data: Omit<ProductVariation, "id" | "createdAt">) => {
    throw new Error("Variations should be added through product creation/update")
  }

  const updateVariation = async (id: string, data: Partial<ProductVariation>) => {
    throw new Error("Variations should be updated through product update")
  }

  const deleteVariation = async (id: string) => {
    throw new Error("Variations should be deleted through product update")
  }

  return { variations, isLoading, addVariation, updateVariation, deleteVariation }
}
