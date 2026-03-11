"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "../services/contact.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export const contactKeys = {
  all: ["contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params: ContactListParams) =>
    [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  tags: () => [...contactKeys.all, "tags"] as const,
};

export function useContactsPaginated(params: ContactListParams = {}) {
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
    }),
    queryFn: () => getContacts(params),
    placeholderData: (prev) => prev,
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => getContactById(id),
    enabled: !!id,
  });
}

export function useContactTags() {
  return useQuery({
    queryKey: contactKeys.tags(),
    queryFn: () => getContactTags(),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactData) => createContact(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.lists() }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactData }) =>
      updateContact(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.lists() }),
  });
}

export function useCreateContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createContactTag(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.tags() }),
  });
}

export function useUpdateContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateContactTag(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.tags() }),
  });
}

export function useDeleteContactTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContactTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.tags() }),
  });
}

export function useAddContactNote(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => addContactNote(contactId, content),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useDeleteContactNote(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteContactNote(contactId, noteId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useAddContactAttachment(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => addContactAttachment(contactId, file),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useDeleteContactAttachment(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      deleteContactAttachment(contactId, attachmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useAddContactCommunication(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: "CALL" | "EMAIL" | "MEETING";
      subject?: string;
      notes?: string;
    }) => addContactCommunication(contactId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contactKeys.detail(contactId) }),
  });
}

export function useImportContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importContactsCsv(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.lists() }),
  });
}

export { exportContactsCsv };
