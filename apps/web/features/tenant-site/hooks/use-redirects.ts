"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  redirectsService,
  type CreateRedirectData,
  type UpdateRedirectData,
} from "../services/redirects.service";

export const redirectKeys = {
  all: ["redirects"] as const,
  list: () => [...redirectKeys.all, "list"] as const,
};

export function useRedirects() {
  return useQuery({
    queryKey: redirectKeys.list(),
    queryFn: () => redirectsService.listAll(),
  });
}

export function useCreateRedirect() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateRedirectData) => redirectsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: redirectKeys.list() });
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
      redirectsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: redirectKeys.list() });
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
    mutationFn: (id: string) => redirectsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: redirectKeys.list() });
      toast({ title: "Redirect deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete redirect", variant: "destructive" });
    },
  });
}
