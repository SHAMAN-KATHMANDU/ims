"use client"

import { useState } from "react"

// ============================================
// TYPE DEFINITIONS 
// ============================================

export interface Category {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface Product {
  id: string
  imsCode: string
  name: string
  categoryId: string
  description?: string
  length?: number
  breadth?: number
  height?: number
  weight?: number
  costPrice: number
  mrp: number
  createdById: string
  dateCreated: string
}

export interface ProductVariation {
  id: string
  productId: string
  color: string
  stockQuantity: number
  createdAt: string
}

// ============================================
// HOOK: useProducts
// Replace useState with your API calls
// ============================================

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      imsCode: "IMS001",
      name: "Sample Product",
      categoryId: "1",
      description: "A sample product",
      costPrice: 100,
      mrp: 150,
      createdById: "user1",
      dateCreated: "2024-01-01",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  // TODO: Replace with API call
  const addProduct = async (data: Omit<Product, "id" | "createdById" | "dateCreated">) => {
    setIsLoading(true)
    // await fetch('/api/products', { method: 'POST', body: JSON.stringify(data) })
    const newProduct: Product = {
      ...data,
      id: Date.now().toString(),
      createdById: "current-user",
      dateCreated: new Date().toISOString(),
    }
    setProducts((prev) => [...prev, newProduct])
    setIsLoading(false)
    return newProduct
  }

  // TODO: Replace with API call
  const updateProduct = async (id: string, data: Partial<Product>) => {
    setIsLoading(true)
    // await fetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
    setIsLoading(false)
  }

  // TODO: Replace with API call
  const deleteProduct = async (id: string) => {
    setIsLoading(true)
    // await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setIsLoading(false)
  }

  return { products, isLoading, addProduct, updateProduct, deleteProduct }
}

// ============================================
// HOOK: useCategories
// ============================================

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "Electronics", description: "Electronic products", createdAt: "2024-01-01" },
    { id: "2", name: "Accessories", description: "Product accessories", createdAt: "2024-01-02" },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const addCategory = async (data: Omit<Category, "id" | "createdAt">) => {
    setIsLoading(true)
    const newCategory: Category = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setCategories((prev) => [...prev, newCategory])
    setIsLoading(false)
    return newCategory
  }

  const updateCategory = async (id: string, data: Partial<Category>) => {
    setIsLoading(true)
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    setIsLoading(false)
  }

  const deleteCategory = async (id: string) => {
    setIsLoading(true)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setIsLoading(false)
  }

  return { categories, isLoading, addCategory, updateCategory, deleteCategory }
}

// ============================================
// HOOK: useVariations
// ============================================

export function useVariations() {
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addVariation = async (data: Omit<ProductVariation, "id" | "createdAt">) => {
    setIsLoading(true)
    const newVariation: ProductVariation = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setVariations((prev) => [...prev, newVariation])
    setIsLoading(false)
    return newVariation
  }

  const updateVariation = async (id: string, data: Partial<ProductVariation>) => {
    setIsLoading(true)
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)))
    setIsLoading(false)
  }

  const deleteVariation = async (id: string) => {
    setIsLoading(true)
    setVariations((prev) => prev.filter((v) => v.id !== id))
    setIsLoading(false)
  }

  return { variations, isLoading, addVariation, updateVariation, deleteVariation }
}
