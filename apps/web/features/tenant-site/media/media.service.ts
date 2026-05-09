import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { MediaAsset } from "./types";

export interface ListMediaParams {
  folder?: string;
  limit?: number;
  cursor?: string;
}

export const mediaService = {
  async list(params?: ListMediaParams): Promise<MediaAsset[]> {
    try {
      const { data } = await api.get<{ items: MediaAsset[] }>("/media/assets", {
        params,
      });
      return data.items ?? [];
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
    updates: { altText?: string | null; name?: string; folder?: string | null },
  ): Promise<MediaAsset> {
    try {
      const { data } = await api.patch<{ asset: MediaAsset }>(
        `/media/assets/${id}`,
        {
          altText: updates.altText,
          fileName: updates.name,
          folder: updates.folder,
        },
      );
      return data.asset;
    } catch (error) {
      throw handleApiError(error, "media");
    }
  },

  async listFolders(): Promise<string[]> {
    try {
      const { data } = await api.get<{ folders: string[] }>("/media/folders");
      return data.folders;
    } catch (error) {
      throw handleApiError(error, "media folders");
    }
  },
};
