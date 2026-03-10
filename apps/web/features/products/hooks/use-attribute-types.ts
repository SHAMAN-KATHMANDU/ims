"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttributeTypes,
  getAttributeTypesPaginated,
  getAttributeTypeById,
  createAttributeType,
  updateAttributeType,
  deleteAttributeType,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
  type AttributeType,
  type AttributeValue,
  type CreateAttributeTypeData,
  type UpdateAttributeTypeData,
  type CreateAttributeValueData,
  type UpdateAttributeValueData,
  type AttributeTypeListParams,
} from "../services/attribute-type.service";

export type {
  AttributeType,
  AttributeValue,
  CreateAttributeTypeData,
  UpdateAttributeTypeData,
  CreateAttributeValueData,
  UpdateAttributeValueData,
};

export const attributeTypeKeys = {
  all: ["attributeTypes"] as const,
  lists: () => [...attributeTypeKeys.all, "list"] as const,
  list: (params: AttributeTypeListParams) =>
    [...attributeTypeKeys.lists(), params] as const,
  detail: (id: string) => [...attributeTypeKeys.all, "detail", id] as const,
};

export function useAttributeTypes() {
  return useQuery({
    queryKey: attributeTypeKeys.lists(),
    queryFn: getAttributeTypes,
  });
}

export function useAttributeTypesPaginated(
  params: AttributeTypeListParams = {},
) {
  const normalized = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };
  return useQuery({
    queryKey: attributeTypeKeys.list(normalized),
    queryFn: () => getAttributeTypesPaginated(normalized),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAttributeType(id: string) {
  return useQuery({
    queryKey: attributeTypeKeys.detail(id),
    queryFn: () => getAttributeTypeById(id),
    enabled: !!id,
  });
}

export function useCreateAttributeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttributeTypeData) => createAttributeType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
    },
  });
}

export function useUpdateAttributeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttributeTypeData }) =>
      updateAttributeType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributeTypeKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteAttributeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttributeType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
    },
  });
}

export function useCreateAttributeValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      data,
    }: {
      typeId: string;
      data: CreateAttributeValueData;
    }) => createAttributeValue(typeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributeTypeKeys.detail(variables.typeId),
      });
    },
  });
}

export function useUpdateAttributeValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      valueId,
      data,
    }: {
      typeId: string;
      valueId: string;
      data: UpdateAttributeValueData;
    }) => updateAttributeValue(typeId, valueId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributeTypeKeys.detail(variables.typeId),
      });
    },
  });
}

export function useDeleteAttributeValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, valueId }: { typeId: string; valueId: string }) =>
      deleteAttributeValue(typeId, valueId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attributeTypeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributeTypeKeys.detail(variables.typeId),
      });
    },
  });
}
