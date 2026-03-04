import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";

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
  source?: string | null;
  journeyType?: string | null;
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
    memberStatus?: string | null;
    totalSales?: number | null;
    memberSince?: string | null;
  } | null;
  owner?: { id: string; username: string };
  tagLinks?: Array<{ tag: ContactTag }>;
  _count?: { deals: number; tasks: number };
  deals?: Array<{ stage: string }>;
}

export type ContactNote = {
  id: string;
  content: string;
  createdAt: string;
  creator?: { id: string; username: string };
};

export type ContactAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  uploader?: { id: string; username: string };
};

export type ContactCommunication = {
  id: string;
  type: "CALL" | "EMAIL" | "MEETING";
  subject?: string | null;
  notes?: string | null;
  createdAt: string;
  creator?: { id: string; username: string };
};

export type ContactDeal = {
  id: string;
  name: string;
  value: number;
  stage: string;
  status: string;
  expectedCloseDate?: string | null;
};

export type ContactTask = {
  id: string;
  title: string;
  dueDate?: string | null;
  completed: boolean;
  assignedTo?: { id: string; username: string };
};

export interface ContactDetail extends Contact {
  notes?: ContactNote[];
  attachments?: ContactAttachment[];
  communications?: ContactCommunication[];
  deals?: ContactDeal[];
  tasks?: ContactTask[];
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
  source?: string;
  journeyType?: string;
}

export interface UpdateContactData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
  memberId?: string;
  tagIds?: string[];
  source?: string;
  journeyType?: string;
}

export async function getContacts(
  params: ContactListParams = {},
): Promise<PaginatedContactsResponse> {
  const res = await api.get("/contacts", { params });
  return res.data;
}

export async function getContactById(
  id: string,
): Promise<{ contact: ContactDetail }> {
  const res = await api.get(`/contacts/${id}`);
  return res.data;
}

export async function createContact(
  data: CreateContactData,
): Promise<{ contact: Contact }> {
  const res = await api.post("/contacts", data);
  return res.data;
}

export async function updateContact(
  id: string,
  data: UpdateContactData,
): Promise<{ contact: Contact }> {
  const res = await api.put(`/contacts/${id}`, data);
  return res.data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

export async function getContactTags(): Promise<{ tags: ContactTag[] }> {
  const res = await api.get("/contacts/tags");
  return res.data;
}

export async function createContactTag(
  name: string,
): Promise<{ tag: ContactTag }> {
  const res = await api.post("/contacts/tags", { name });
  return res.data;
}

export async function addContactNote(
  contactId: string,
  content: string,
): Promise<{ note: ContactNote }> {
  const res = await api.post(`/contacts/${contactId}/notes`, { content });
  return res.data;
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
): Promise<{ attachment: ContactAttachment }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/contacts/${contactId}/attachments`, formData);
  return res.data;
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
): Promise<{ communication: ContactCommunication }> {
  const res = await api.post(`/contacts/${contactId}/communications`, data);
  return res.data;
}

export async function importContactsCsv(file: File): Promise<{
  created: number;
  total: number;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/contacts/import", formData);
  return res.data;
}

export async function exportContactsCsv(ids?: string[]): Promise<Blob> {
  const params = ids?.length ? { ids: ids.join(",") } : {};
  const res = await api.get("/contacts/export", {
    params,
    responseType: "blob",
  });
  return res.data;
}
