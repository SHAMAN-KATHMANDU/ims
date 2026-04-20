import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface Collection {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  sort: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetail extends Omit<Collection, "productCount"> {
  productIds: string[];
}

export interface CreateCollectionData {
  slug: string;
  title: string;
  subtitle?: string;
  sort?: number;
  isActive?: boolean;
}

export interface UpdateCollectionData {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  sort?: number;
  isActive?: boolean;
}

export const collectionsService = {
  async list(): Promise<Collection[]> {
    try {
      const { data } = await api.get<{ collections: Collection[] }>(
        "/collections",
      );
      return data.collections ?? [];
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async get(id: string): Promise<CollectionDetail> {
    try {
      const { data } = await api.get<{ collection: CollectionDetail }>(
        `/collections/${id}`,
      );
      return data.collection;
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async create(payload: CreateCollectionData): Promise<Collection> {
    try {
      const { data } = await api.post<{ collection: Collection }>(
        "/collections",
        payload,
      );
      return data.collection;
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async update(id: string, payload: UpdateCollectionData): Promise<Collection> {
    try {
      const { data } = await api.patch<{ collection: Collection }>(
        `/collections/${id}`,
        payload,
      );
      return data.collection;
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/collections/${id}`);
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async setProducts(id: string, productIds: string[]): Promise<void> {
    try {
      await api.put(`/collections/${id}/products`, { productIds });
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },
};
