import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { ConsentDetails, ConsentDecisionResult } from "../types";

// Note: api.* response.data is the unwrapped payload from the {success,data}
// envelope (handled by the global axios interceptor in apps/web/lib/axios.ts).

export async function getConsentDetails(
  requestId: string,
): Promise<ConsentDetails> {
  try {
    const res = await api.get<ConsentDetails>(`/oauth/consent/${requestId}`, {
      // Expired/unknown requests (404/410) are rendered inline by the page.
      skipGlobalErrorToast: true,
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "load authorization request");
  }
}

export async function submitConsentDecision(
  requestId: string,
  approved: boolean,
): Promise<ConsentDecisionResult> {
  try {
    const res = await api.post<ConsentDecisionResult>(
      `/oauth/consent/${requestId}/decision`,
      { approved },
      { skipGlobalErrorToast: true },
    );
    return res.data;
  } catch (error) {
    handleApiError(error, "submit authorization decision");
  }
}
