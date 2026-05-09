import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { MediaAsset } from "./types";

export interface ListMediaParams {
  folder?: string;
  search?: string;
  limit?: number;
}

export const mediaService = {
  async list(params?: ListMediaParams): Promise<MediaAsset[]> {
    try {
      const { data } = await api.get<{ media: MediaAsset[] }>("/media/assets", {
        params,
      });
      return data.media ?? [];
    } catch (error) {
      throw handleApiError(error, "media");
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/media/assets/${id}`);
    } catch (error) {
      throw handleApiError(error, "media");
    }
  },

  async update(
    id: string,
    updates: { altText?: string; name?: string },
  ): Promise<MediaAsset> {
    try {
      const { data } = await api.patch<{ asset: MediaAsset }>(
        `/media/assets/${id}`,
        updates,
      );
      return data.asset;
    } catch (error) {
      throw handleApiError(error, "media");
    }
  },
};
