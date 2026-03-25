import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface TenantPaymentMethodConfig {
  id: string;
  code: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface PaymentMethodsResponse {
  paymentMethods: TenantPaymentMethodConfig[];
}

export async function getTenantPaymentMethods(): Promise<PaymentMethodsResponse> {
  try {
    const response = await api.get<{
      message: string;
      paymentMethods: TenantPaymentMethodConfig[];
    }>("/tenant-settings/payment-methods");
    return { paymentMethods: response.data.paymentMethods ?? [] };
  } catch (error) {
    handleApiError(error, "fetch tenant payment methods");
  }
}

export async function updateTenantPaymentMethods(
  paymentMethods: TenantPaymentMethodConfig[],
): Promise<PaymentMethodsResponse> {
  try {
    const response = await api.put<{
      message: string;
      paymentMethods: TenantPaymentMethodConfig[];
    }>("/tenant-settings/payment-methods", { paymentMethods });
    return { paymentMethods: response.data.paymentMethods ?? [] };
  } catch (error) {
    handleApiError(error, "update tenant payment methods");
  }
}
