/**
 * Category Service
 * 
 * Service layer for category management operations
 * Follows MVC pattern - this is the Model/Controller layer
 */

import { useAxios } from "@/hooks/useAxios"

export interface Category {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryData {
  name: string
  description?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
}

export interface CategoriesResponse {
  message: string
  categories: Category[]
  count: number
}

export interface CategoryResponse {
  message: string
  category: Category
}

/**
 * Category Service Class
 */
export class CategoryService {
  private axios: ReturnType<typeof useAxios>

  constructor(axiosInstance: ReturnType<typeof useAxios>) {
    this.axios = axiosInstance
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    const response = await this.axios.get<CategoriesResponse>("/categories")
    return response.data.categories
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await this.axios.get<CategoryResponse>(`/categories/${id}`)
    return response.data.category
  }

  /**
   * Create a new category (admin and superAdmin only)
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await this.axios.post<CategoryResponse>("/categories", data)
    return response.data.category
  }

  /**
   * Update a category (admin and superAdmin only)
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    const response = await this.axios.put<CategoryResponse>(`/categories/${id}`, data)
    return response.data.category
  }

  /**
   * Delete a category (admin and superAdmin only)
   */
  async deleteCategory(id: string): Promise<void> {
    await this.axios.delete(`/categories/${id}`)
  }
}
