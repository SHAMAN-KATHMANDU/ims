"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlanLimits,
  upsertPlanLimit,
} from "../services/plan-limits.service";
import type { PlanTier, PlanLimit, UpsertPlanLimitData } from "../types";

export type { PlanTier, PlanLimit, UpsertPlanLimitData };

export const planLimitsKeys = {
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
