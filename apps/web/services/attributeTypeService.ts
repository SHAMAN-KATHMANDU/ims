/**
 * Attribute Type Service
 *
 * Tenant-customizable attribute types and values for product variations (EAV model).
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export interface AttributeValue {
  id: string;
  attributeTypeId: string;
  value: string;
  code?: string | null;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttributeType {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  values: AttributeValue[];
}

export interface CreateAttributeTypeData {
  name: string;
  code?: string;
  displayOrder?: number;
}

export interface UpdateAttributeTypeData {
  name?: string;
  code?: string;
  displayOrder?: number;
}

export interface CreateAttributeValueData {
  value: string;
  code?: string;
  displayOrder?: number;
}

export interface UpdateAttributeValueData {
  value?: string;
  code?: string;
  displayOrder?: number;
}

// ============================================
// API Functions
// ============================================

export async function getAttributeTypes(): Promise<AttributeType[]> {
  try {
    const response = await api.get<{
      message: string;
      attributeTypes: AttributeType[];
    }>("/attribute-types");
    return response.data.attributeTypes ?? [];
  } catch (error) {
    handleApiError(error, "fetch attribute types");
  }
}

export async function getAttributeTypeById(id: string): Promise<AttributeType> {
  if (!id?.trim()) throw new Error("Attribute type ID is required");
  try {
    const response = await api.get<{
      message: string;
      attributeType: AttributeType;
    }>(`/attribute-types/${id}`);
    return response.data.attributeType;
  } catch (error) {
    handleApiError(error, `fetch attribute type "${id}"`);
  }
}

export async function createAttributeType(
  data: CreateAttributeTypeData,
): Promise<AttributeType> {
  if (!data.name?.trim()) throw new Error("Name is required");
  try {
    const response = await api.post<{
      message: string;
      attributeType: AttributeType;
    }>("/attribute-types", data);
    return response.data.attributeType;
  } catch (error) {
    handleApiError(error, "create attribute type");
  }
}

export async function updateAttributeType(
  id: string,
  data: UpdateAttributeTypeData,
): Promise<AttributeType> {
  if (!id?.trim()) throw new Error("Attribute type ID is required");
  try {
    const response = await api.put<{
      message: string;
      attributeType: AttributeType;
    }>(`/attribute-types/${id}`, data);
    return response.data.attributeType;
  } catch (error) {
    handleApiError(error, `update attribute type "${id}"`);
  }
}

export async function deleteAttributeType(id: string): Promise<void> {
  if (!id?.trim()) throw new Error("Attribute type ID is required");
  try {
    await api.delete(`/attribute-types/${id}`);
  } catch (error) {
    handleApiError(error, `delete attribute type "${id}"`);
  }
}

export async function getAttributeValues(
  typeId: string,
): Promise<AttributeValue[]> {
  if (!typeId?.trim()) throw new Error("Attribute type ID is required");
  try {
    const response = await api.get<{
      message: string;
      values: AttributeValue[];
    }>(`/attribute-types/${typeId}/values`);
    return response.data.values ?? [];
  } catch (error) {
    handleApiError(error, `fetch values for attribute type "${typeId}"`);
  }
}

export async function createAttributeValue(
  typeId: string,
  data: CreateAttributeValueData,
): Promise<AttributeValue> {
  if (!typeId?.trim()) throw new Error("Attribute type ID is required");
  if (!data.value?.trim()) throw new Error("Value is required");
  try {
    const response = await api.post<{
      message: string;
      attributeValue: AttributeValue;
    }>(`/attribute-types/${typeId}/values`, data);
    return response.data.attributeValue;
  } catch (error) {
    handleApiError(error, "create attribute value");
  }
}

export async function updateAttributeValue(
  typeId: string,
  valueId: string,
  data: UpdateAttributeValueData,
): Promise<AttributeValue> {
  if (!typeId?.trim() || !valueId?.trim())
    throw new Error("Attribute type ID and value ID are required");
  try {
    const response = await api.put<{
      message: string;
      attributeValue: AttributeValue;
    }>(`/attribute-types/${typeId}/values/${valueId}`, data);
    return response.data.attributeValue;
  } catch (error) {
    handleApiError(error, `update attribute value "${valueId}"`);
  }
}

export async function deleteAttributeValue(
  typeId: string,
  valueId: string,
): Promise<void> {
  if (!typeId?.trim() || !valueId?.trim())
    throw new Error("Attribute type ID and value ID are required");
  try {
    await api.delete(`/attribute-types/${typeId}/values/${valueId}`);
  } catch (error) {
    handleApiError(error, `delete attribute value "${valueId}"`);
  }
}
