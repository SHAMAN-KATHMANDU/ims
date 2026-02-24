import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import { DEFAULT_PAGINATION_META } from "@/lib/apiTypes";

export interface ContactTag {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  memberId?: string | null;
  ownedById: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  member?: {
    id: string;
    name: string | null;
    phone: string;
    email?: string | null;
  } | null;
  owner?: { id: string; username: string };
  tagLinks?: Array<{ tag: ContactTag }>;
  _count?: { deals: number; tasks: number };
}

export interface ContactDetail extends Contact {
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    creator?: { id: string; username: string };
  }>;
  attachments?: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    createdAt: string;
    uploader?: { id: string; username: string };
  }>;
  communications?: Array<{
    id: string;
    type: "CALL" | "EMAIL" | "MEETING";
    subject?: string | null;
    notes?: string | null;
    createdAt: string;
    creator?: { id: string; username: string };
  }>;
  deals?: Array<{
    id: string;
    name: string;
    value: number;
    stage: string;
    status: string;
    expectedCloseDate?: string | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    completed: boolean;
    assignedTo?: { id: string; username: string };
  }>;
}

export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  companyId?: string;
  tagId?: string;
  ownerId?: string;
}

export interface PaginatedContactsResponse {
  data: Contact[];
  pagination: PaginationMeta;
}

export interface CreateContactData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
  memberId?: string;
  tagIds?: string[];
}

export interface UpdateContactData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
  memberId?: string;
  tagIds?: string[];
}

export async function getContacts(
  params: ContactListParams = {},
): Promise<PaginatedContactsResponse> {
  const res = await api.get<{ data?: Contact[]; pagination?: PaginationMeta }>(
    "/contacts",
    { params },
  );
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? DEFAULT_PAGINATION_META,
  };
}

export async function getContactById(
  id: string,
): Promise<{ contact: ContactDetail }> {
  const res = await api.get(`/contacts/${id}`);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createContact(
  data: CreateContactData,
): Promise<{ contact: Contact }> {
  const res = await api.post("/contacts", data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateContact(
  id: string,
  data: UpdateContactData,
): Promise<{ contact: Contact }> {
  const res = await api.put(`/contacts/${id}`, data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

export async function getContactTags(): Promise<{ tags: ContactTag[] }> {
  const res = await api.get("/contacts/tags");
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createContactTag(
  name: string,
): Promise<{ tag: ContactTag }> {
  const res = await api.post("/contacts/tags", { name });
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function addContactNote(
  contactId: string,
  content: string,
): Promise<{ note: unknown }> {
  const res = await api.post(`/contacts/${contactId}/notes`, { content });
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteContactNote(
  contactId: string,
  noteId: string,
): Promise<void> {
  await api.delete(`/contacts/${contactId}/notes/${noteId}`);
}

export async function addContactAttachment(
  contactId: string,
  file: File,
): Promise<{ attachment: unknown }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/contacts/${contactId}/attachments`, formData);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteContactAttachment(
  contactId: string,
  attachmentId: string,
): Promise<void> {
  await api.delete(`/contacts/${contactId}/attachments/${attachmentId}`);
}

export async function addContactCommunication(
  contactId: string,
  data: {
    type: "CALL" | "EMAIL" | "MEETING";
    subject?: string;
    notes?: string;
  },
): Promise<{ communication: unknown }> {
  const res = await api.post(`/contacts/${contactId}/communications`, data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function importContactsCsv(file: File): Promise<{
  created: number;
  total: number;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/contacts/import", formData);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function exportContactsCsv(ids?: string[]): Promise<Blob> {
  const params = ids?.length ? { ids: ids.join(",") } : {};
  const res = await api.get("/contacts/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}
