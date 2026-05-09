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

export interface UpdateFormData extends Partial<CreateFormData> {}

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
      const { data: response } = await api.get("/forms");
      return response.data as ListFormsResponse;
    } catch (error) {
      throw handleApiError(error, "listForms");
    }
  },

  async getForm(id: string): Promise<GetFormResponse> {
    try {
      const { data: response } = await api.get(`/forms/${id}`);
      return response.data as GetFormResponse;
    } catch (error) {
      throw handleApiError(error, "getForm");
    }
  },

  async createForm(payload: CreateFormData): Promise<GetFormResponse> {
    try {
      const { data: response } = await api.post("/forms", payload);
      return response.data as GetFormResponse;
    } catch (error) {
      throw handleApiError(error, "createForm");
    }
  },

  async updateForm(
    id: string,
    payload: UpdateFormData,
  ): Promise<GetFormResponse> {
    try {
      const { data: response } = await api.patch(`/forms/${id}`, payload);
      return response.data as GetFormResponse;
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
      const { data: response } = await api.get(`/forms/${formId}/submissions`, {
        params: { limit, offset },
      });
      return response.data as FormSubmissionsResponse;
    } catch (error) {
      throw handleApiError(error, "listFormSubmissions");
    }
  },
};
