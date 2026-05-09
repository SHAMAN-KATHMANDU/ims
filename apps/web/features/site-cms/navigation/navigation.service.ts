import axios from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { NavigationConfig } from "./types";

const API_BASE = "/sites/config";

interface SiteConfigResponse {
  success: boolean;
  data: {
    navigation?: NavigationConfig;
  };
}

export const navigationService = {
  async getNavigation(): Promise<NavigationConfig | null> {
    try {
      const { data } = await axios.get<SiteConfigResponse>(API_BASE);
      return data.data?.navigation || null;
    } catch (error) {
      throw handleApiError(error, "fetch navigation");
    }
  },

  async updateNavigation(navigation: NavigationConfig): Promise<void> {
    try {
      await axios.put<SiteConfigResponse>(API_BASE, {
        navigation,
      });
    } catch (error) {
      throw handleApiError(error, "update navigation");
    }
  },
};
