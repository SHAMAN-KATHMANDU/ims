import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface Form {
  id: string;
  name: string;
  slug: string;
  description?: string;
  fields: unknown[]; // FormFieldDef[]
  submitTo: "email" | "webhook" | "crm-lead";
  recipients: string[];
  successMessage?: string;
  status: "draft" | "active" | "paused";
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  formId?: string;
  fields: unknown[]; // { label, value }[]
  submitTo: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface ListFormsResponse {
  forms: Form[];
}

export interface GetFormResponse {
  form: Form;
}

export interface CreateFormData {
  name: string;
  slug: string;
  description?: string;
  fields: unknown[];
  submitTo: "email" | "webhook" | "crm-lead";
  recipients?: string[];
  successMessage?: string;
  status?: "draft" | "active" | "paused";
}

export type UpdateFormData = Partial<CreateFormData>;

export interface FormSubmissionsResponse {
  submissions: FormSubmission[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const formsService = {
  async listForms(): Promise<ListFormsResponse> {
    try {
      const { data } = await api.get<ListFormsResponse>("/forms");
      return data;
    } catch (error) {
      throw handleApiError(error, "listForms");
    }
  },

  async getForm(id: string): Promise<GetFormResponse> {
    try {
      const { data } = await api.get<GetFormResponse>(`/forms/${id}`);
      return data;
    } catch (error) {
      throw handleApiError(error, "getForm");
    }
  },

  async createForm(payload: CreateFormData): Promise<GetFormResponse> {
    try {
      const { data } = await api.post<GetFormResponse>("/forms", payload);
      return data;
    } catch (error) {
      throw handleApiError(error, "createForm");
    }
  },

  async updateForm(
    id: string,
    payload: UpdateFormData,
  ): Promise<GetFormResponse> {
    try {
      const { data } = await api.patch<GetFormResponse>(
        `/forms/${id}`,
        payload,
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "updateForm");
    }
  },

  async deleteForm(id: string): Promise<void> {
    try {
      await api.delete(`/forms/${id}`);
    } catch (error) {
      throw handleApiError(error, "deleteForm");
    }
  },

  async listFormSubmissions(
    formId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<FormSubmissionsResponse> {
    try {
      const { data } = await api.get<FormSubmissionsResponse>(
        `/forms/${formId}/submissions`,
        { params: { limit, offset } },
      );
      return data;
    } catch (error) {
      throw handleApiError(error, "listFormSubmissions");
    }
  },
};
