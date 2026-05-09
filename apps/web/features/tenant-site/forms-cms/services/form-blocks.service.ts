import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { SiteLayoutScope } from "@repo/shared";

export interface FormBlockInfo {
  formId: string;
  name: string;
  scope: SiteLayoutScope;
  pageId?: string;
  fieldsCount: number;
  submissionsCount: number;
}

export interface FormSubmissionData {
  id: string;
  formId: string;
  tenantId: string;
  fields: Array<{ label: string; value: string }>;
  submitTo: "email" | "crm-lead";
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmissionsResponse {
  submissions: FormSubmissionData[];
  total: number;
  page: number;
  limit: number;
}

async function getFormSubmissions(
  formId: string,
  params?: { page?: number; limit?: number; from?: string; to?: string },
): Promise<FormSubmissionsResponse> {
  try {
    const res = await api.get<FormSubmissionsResponse>("/form-submissions", {
      params: { formId, ...params },
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "fetch form submissions");
    throw error;
  }
}

export const formBlocksService = {
  getFormSubmissions,
};
