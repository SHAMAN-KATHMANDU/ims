"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActivitiesByContact,
  getActivitiesByDeal,
  createActivity,
  deleteActivity,
  type Activity,
  type GetActivitiesParams,
} from "../services/activity.service";

export const activityKeys = {
  all: ["activities"] as const,
  byContact: (contactId: string, params?: GetActivitiesParams) =>
    [...activityKeys.all, "contact", contactId, params] as const,
  byDeal: (dealId: string, params?: GetActivitiesParams) =>
    [...activityKeys.all, "deal", dealId, params] as const,
};

export function useActivitiesByContact(
  contactId: string,
  params?: GetActivitiesParams,
) {
  return useQuery({
    queryKey: activityKeys.byContact(contactId, params),
    queryFn: () => getActivitiesByContact(contactId, params),
    enabled: !!contactId,
  });
}

export function useActivitiesByDeal(
  dealId: string,
  params?: GetActivitiesParams,
) {
  return useQuery({
    queryKey: activityKeys.byDeal(dealId, params),
    queryFn: () => getActivitiesByDeal(dealId, params),
    enabled: !!dealId,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: "CALL" | "EMAIL" | "MEETING";
      subject?: string;
      notes?: string;
      activityAt?: string;
      contactId?: string;
      memberId?: string;
      dealId?: string;
    }) => createActivity(data),
    onSuccess: (_, variables) => {
      if (variables.contactId) {
        qc.invalidateQueries({
          queryKey: activityKeys.byContact(variables.contactId),
        });
      }
      if (variables.dealId) {
        qc.invalidateQueries({
          queryKey: activityKeys.byDeal(variables.dealId),
        });
      }
      qc.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}

export type { Activity };
