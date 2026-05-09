import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type {
  CollectionDetail,
  CreateCollectionPayload,
  UpdateCollectionPayload,
} from "./types";

export type { CreateCollectionPayload, UpdateCollectionPayload };

export const collectionsCmsService = {
  async list(): Promise<CollectionDetail[]> {
    try {
      const { data } = await api.get<{ collections: CollectionDetail[] }>(
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

  async create(payload: CreateCollectionPayload): Promise<CollectionDetail> {
    try {
      const { data } = await api.post<{ collection: CollectionDetail }>(
        "/collections",
        payload,
      );
      return data.collection;
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async update(
    id: string,
    payload: UpdateCollectionPayload,
  ): Promise<CollectionDetail> {
    try {
      const { data } = await api.patch<{ collection: CollectionDetail }>(
        `/collections/${id}`,
        payload,
      );
      return data.collection;
    } catch (error) {
      throw handleApiError(error, "collections");
    }
  },

  async delete(id: string): Promise<void> {
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
