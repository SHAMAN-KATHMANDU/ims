"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRedirects,
  getRedirect,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  type CreateRedirectData,
  type UpdateRedirectData,
} from "../services/redirects.service";
import { useToast } from "@/hooks/useToast";

export const redirectKeys = {
  all: ["redirects"] as const,
  list: () => [...redirectKeys.all, "list"] as const,
  detail: (id: string) => [...redirectKeys.all, "detail", id] as const,
};

export function useRedirects() {
  return useQuery({
    queryKey: redirectKeys.list(),
    queryFn: () => listRedirects(),
    retry: false,
  });
}

export function useRedirect(id: string | null) {
  return useQuery({
    queryKey: redirectKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Redirect id is required");
      return getRedirect(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateRedirect() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRedirectData) => createRedirect(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: redirectKeys.all });
      toast({ title: "Redirect created" });
    },
    onError: () => {
      toast({ title: "Failed to create redirect", variant: "destructive" });
    },
  });
}

export function useUpdateRedirect() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRedirectData }) =>
      updateRedirect(id, data),
    onSuccess: (redirect) => {
      qc.invalidateQueries({ queryKey: redirectKeys.all });
      qc.setQueryData(redirectKeys.detail(redirect.id), redirect);
      toast({ title: "Redirect updated" });
    },
    onError: () => {
      toast({ title: "Failed to update redirect", variant: "destructive" });
    },
  });
}

export function useDeleteRedirect() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteRedirect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: redirectKeys.all });
      toast({ title: "Redirect deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete redirect", variant: "destructive" });
    },
  });
}
