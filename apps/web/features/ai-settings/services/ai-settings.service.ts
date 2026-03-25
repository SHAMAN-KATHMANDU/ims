import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type {
  AiSettings,
  AiSettingsResponse,
  UpdateAiSettingsData,
} from "../types";

export const aiSettingsService = {
  async get(): Promise<AiSettings> {
    try {
      const { data } = await api.get<AiSettingsResponse>("/ai-settings");
      return data.settings;
    } catch (error) {
      throw handleApiError(error, "fetch AI settings");
    }
  },

  async update(payload: UpdateAiSettingsData): Promise<AiSettings> {
    try {
      const { data } = await api.put<AiSettingsResponse>(
        "/ai-settings",
        payload,
      );
      return data.settings;
    } catch (error) {
      throw handleApiError(error, "update AI settings");
    }
  },
};
