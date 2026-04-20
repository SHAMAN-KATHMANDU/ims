"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  collectionsService,
  type CreateCollectionData,
  type UpdateCollectionData,
} from "../services/collections.service";

export type {
  Collection,
  CollectionDetail,
} from "../services/collections.service";

export const collectionKeys = {
  all: ["collections"] as const,
  list: () => [...collectionKeys.all, "list"] as const,
  detail: (id: string) => [...collectionKeys.all, "detail", id] as const,
};

export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.list(),
    queryFn: collectionsService.list,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => collectionsService.get(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateCollectionData) =>
      collectionsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      toast({ title: "Collection created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCollectionData;
    }) => collectionsService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(id) });
      toast({ title: "Collection updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => collectionsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      toast({ title: "Collection deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSetCollectionProducts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, productIds }: { id: string; productIds: string[] }) =>
      collectionsService.setProducts(id, productIds),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: collectionKeys.detail(id) });
      toast({ title: "Products updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update products",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
