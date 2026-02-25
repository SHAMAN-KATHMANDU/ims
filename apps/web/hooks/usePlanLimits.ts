"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlanLimits,
  upsertPlanLimit,
  type PlanTier,
  type PlanLimit,
  type UpsertPlanLimitData,
} from "@/services/planLimitsService";

export type { PlanTier, PlanLimit, UpsertPlanLimitData };

const planLimitsKeys = {
  all: ["platform", "plan-limits"] as const,
  list: () => [...planLimitsKeys.all] as const,
};

export function usePlanLimits() {
  return useQuery({
    queryKey: planLimitsKeys.list(),
    queryFn: getPlanLimits,
  });
}

export function useUpsertPlanLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tier,
      data,
    }: {
      tier: PlanTier;
      data: UpsertPlanLimitData;
    }) => upsertPlanLimit(tier, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planLimitsKeys.list() });
    },
  });
}
