/**
 * Site theme service — dedicated endpoints for theme token management.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { ThemeTokens } from "@repo/shared";

export async function getThemeTokens(): Promise<ThemeTokens | null> {
  try {
    const { data } = await api.get<{ theme: ThemeTokens | null }>(
      "/sites/theme",
    );
    return data.theme ?? null;
  } catch (error) {
    handleApiError(error, "fetch theme tokens");
  }
}

export async function updateThemeTokens(
  themeTokens: Partial<ThemeTokens>,
): Promise<ThemeTokens | null> {
  try {
    const { data } = await api.put<{ theme: ThemeTokens | null }>(
      "/sites/theme",
      themeTokens,
    );
    return data.theme ?? null;
  } catch (error) {
    handleApiError(error, "update theme tokens");
  }
}
