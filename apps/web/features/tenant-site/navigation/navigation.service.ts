import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { NavigationData } from "./types";

export const navigationService = {
  async get(): Promise<NavigationData> {
    try {
      const { data } = await api.get<{ navigation: NavigationData }>(
        "/site/navigation",
      );
      return data.navigation;
    } catch (error) {
      // Return sensible defaults if endpoint doesn't exist yet
      console.warn("Navigation endpoint not found, using defaults");
      return {
        primaryNav: [],
        footer: [],
        announcementBar: null,
        mobileMenuCustom: false,
      };
    }
  },

  async update(payload: NavigationData): Promise<NavigationData> {
    try {
      const { data } = await api.put<{ navigation: NavigationData }>(
        "/site/navigation",
        payload,
      );
      return data.navigation;
    } catch (error) {
      throw handleApiError(error, "navigation");
    }
  },
};
