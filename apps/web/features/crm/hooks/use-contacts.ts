"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactTags,
  createContactTag,
  updateContactTag,
  deleteContactTag,
  addContactNote,
  deleteContactNote,
  addContactAttachment,
  deleteContactAttachment,
  addContactCommunication,
  importContactsCsv,
  exportContactsCsv,
  type ContactListParams,
  type CreateContactData,
  type UpdateContactData,
  type GetContactTagsParams,
} from "../services/contact.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { useS3DirectUpload } from "@/features/media";
import { crmKeys, taskKeys, dealKeys, contactKeys } from "./_query-keys";

export { contactKeys };

export function useContactsPaginated(
  params: ContactListParams = {},
  options?: { enabled?: boolean },
) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: contactKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
      companyId: params.companyId,
      tagId: params.tagId,
      ownerId: params.ownerId,
      source: params.source,
      journeyType: params.journeyType,
    }),
    queryFn: () => getContacts(params),
    placeholderData: (prev) => prev,
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useContact(id: string, options?: { enabled?: boolean }) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => getContactById(id),
    enabled: crmEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useContactTags(
  params?: GetContactTagsParams,
  options?: { enabled?: boolean },
) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: contactKeys.tags(params),
    queryFn: () => getContactTags(params),
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useCreateContact() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactData) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return createContact(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useUpdateContact() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactData }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return updateContact(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useDeleteContact() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteContact(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useCreateContactTag() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return createContactTag(name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.tagsAll() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useUpdateContactTag() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return updateContactTag(id, name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.tagsAll() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useDeleteContactTag() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteContactTag(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.tagsAll() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useAddContactNote(contactId: string) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return addContactNote(contactId, content);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useDeleteContactNote(contactId: string) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteContactNote(contactId, noteId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useAddContactAttachment(contactId: string) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  const { uploadFile } = useS3DirectUpload();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      const { key, contentType } = await uploadFile({
        file,
        purpose: "contact_attachment",
        entityId: contactId,
      });
      return addContactAttachment(contactId, {
        storageKey: key,
        fileName: file.name,
        mimeType: contentType,
        fileSize: file.size,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useDeleteContactAttachment(contactId: string) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteContactAttachment(contactId, attachmentId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useAddContactCommunication(contactId: string) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: "CALL" | "EMAIL" | "MEETING";
      subject?: string;
      notes?: string;
    }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return addContactCommunication(contactId, data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useImportContacts() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return importContactsCsv(file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export { exportContactsCsv };
