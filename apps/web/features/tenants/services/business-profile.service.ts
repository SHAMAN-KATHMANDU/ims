/**
 * Business Profile Service
 *
 * Tenant-scoped endpoint for reading and updating the current workspace's
 * business profile (identity, contact, address, tax IDs, defaults, socials).
 *
 * Endpoint contract:
 *   GET  /tenants/me/business-profile  → { success: true, data: { profile: BusinessProfile } }
 *   PATCH /tenants/me/business-profile → { success: true, data: { profile: BusinessProfile } }
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { unwrapApiData } from "@/lib/apiResponse";
import type { BusinessProfile, UpdateBusinessProfileData } from "../types";

interface BusinessProfileApiData {
  profile: BusinessProfile;
}

export async function getMyBusinessProfile(): Promise<{
  profile: BusinessProfile;
}> {
  try {
    const res = await api.get("/tenants/me/business-profile");
    return unwrapApiData<BusinessProfileApiData>(res.data);
  } catch (error) {
    handleApiError(error, "fetch business profile");
  }
}

export async function updateMyBusinessProfile(
  body: UpdateBusinessProfileData,
): Promise<{ profile: BusinessProfile }> {
  try {
    const res = await api.patch("/tenants/me/business-profile", body);
    return unwrapApiData<BusinessProfileApiData>(res.data);
  } catch (error) {
    handleApiError(error, "update business profile");
  }
}
