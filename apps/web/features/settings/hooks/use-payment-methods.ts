"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  getTenantPaymentMethods,
  updateTenantPaymentMethods,
  type TenantPaymentMethodConfig,
} from "../services/payment-methods.service";

export const paymentMethodsKeys = {
  all: ["tenant-payment-methods"] as const,
};

export function useTenantPaymentMethods() {
  return useQuery({
    queryKey: paymentMethodsKeys.all,
    queryFn: getTenantPaymentMethods,
  });
}

export function useUpdateTenantPaymentMethods() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (paymentMethods: TenantPaymentMethodConfig[]) =>
      updateTenantPaymentMethods(paymentMethods),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentMethodsKeys.all });
      toast({ title: "Payment methods updated" });
    },
    onError: (error: Error) => {
      toast({
        title: error.message ?? "Failed to update payment methods",
        variant: "destructive",
      });
    },
  });
}
