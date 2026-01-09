/**
 * Product Service
 * 
 * Service layer for product management operations
 * Follows MVC pattern - this is the Model/Controller layer
 * Handles all API calls related to products
 */

import { useAxios } from "@/hooks/useAxios"

export interface Category {
  id: string
  name: string
  description?: string
  createdAt?: string
}

export interface ProductVariation {
  id: string
  productId: string
  color: string
  stockQuantity: number
  createdAt?: string
  photos?: Array<{
    id: string
    photoUrl: string
    isPrimary: boolean
  }>
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
  category?: Category
  createdBy?: {
    id: string
    username: string
    role: string
  }
  variations?: ProductVariation[]
  discounts?: Array<{
    id: string
    discountTypeId: string
    discountPercentage: number
    startDate?: string
    endDate?: string
    isActive: boolean
    discountType?: {
      id: string
      name: string
      description?: string
    }
  }>
}

export interface CreateProductData {
  imsCode: string
  name: string
  categoryId?: string
  categoryName?: string
  description?: string
  length?: number
  breadth?: number
  height?: number
  weight?: number
  costPrice: number
  mrp: number
  variations?: Array<{
    color: string
    stockQuantity?: number
    photos?: Array<{
      photoUrl: string
      isPrimary?: boolean
    }>
  }>
  discounts?: Array<{
    discountTypeId?: string
    discountTypeName?: string
    discountPercentage: number
    startDate?: string
    endDate?: string
    isActive?: boolean
  }>
}

export interface UpdateProductData {
  imsCode?: string
  name?: string
  categoryId?: string
  description?: string
  length?: number
  breadth?: number
  height?: number
  weight?: number
  costPrice?: number
  mrp?: number
  variations?: Array<{
    color: string
    stockQuantity?: number
    photos?: Array<{
      photoUrl: string
      isPrimary?: boolean
    }>
  }>
  discounts?: Array<{
    discountTypeId?: string
    discountTypeName?: string
    discountPercentage: number
    startDate?: string
    endDate?: string
    isActive?: boolean
  }>
}

export interface ProductsResponse {
  message: string
  products: Product[]
  count: number
}

export interface ProductResponse {
  message: string
  product: Product
}

export interface CategoriesResponse {
  message: string
  categories: Category[]
  count: number
}

/**
 * Product Service Class
 * Provides methods for all product-related API operations
 */
export class ProductService {
  private axios: ReturnType<typeof useAxios>

  constructor(axiosInstance: ReturnType<typeof useAxios>) {
    this.axios = axiosInstance
  }

  /**
   * Get all products (all authenticated users)
   */
  async getAllProducts(): Promise<Product[]> {
    const response = await this.axios.get<ProductsResponse>("/products")
    return response.data.products
  }

  /**
   * Get product by ID (all authenticated users)
   */
  async getProductById(id: string): Promise<Product> {
    const response = await this.axios.get<ProductResponse>(`/products/${id}`)
    return response.data.product
  }

  /**
   * Create a new product (admin and superAdmin only)
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    const response = await this.axios.post<ProductResponse>("/products", data)
    return response.data.product
  }

  /**
   * Update a product (admin and superAdmin only)
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const response = await this.axios.put<ProductResponse>(`/products/${id}`, data)
    return response.data.product
  }

  /**
   * Delete a product (admin and superAdmin only)
   */
  async deleteProduct(id: string): Promise<void> {
    await this.axios.delete(`/products/${id}`)
  }

  /**
   * Get all categories (helper endpoint)
   */
  async getAllCategories(): Promise<Category[]> {
    const response = await this.axios.get<CategoriesResponse>("/products/categories/list")
    return response.data.categories
  }

  /**
   * Get all discount types (helper endpoint)
   */
  async getAllDiscountTypes(): Promise<Array<{ id: string; name: string; description?: string }>> {
    const response = await this.axios.get<{
      message: string
      discountTypes: Array<{ id: string; name: string; description?: string }>
      count: number
    }>("/products/discount-types/list")
    return response.data.discountTypes
  }
}
