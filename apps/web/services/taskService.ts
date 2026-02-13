import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";

export interface Task {
  id: string;
  title: string;
  dueDate?: string | null;
  completed: boolean;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  assignedToId: string;
  createdAt: string;
  updatedAt: string;
  contact?: { id: string; firstName: string; lastName?: string | null } | null;
  member?: { id: string; name: string | null; phone: string } | null;
  deal?: { id: string; name: string } | null;
  assignedTo?: { id: string; username: string };
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  completed?: boolean;
  assignedToId?: string;
  dueToday?: boolean;
}

export interface PaginatedTasksResponse {
  data: Task[];
  pagination: PaginationMeta;
}

export interface CreateTaskData {
  title: string;
  dueDate?: string | null;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  assignedToId?: string;
}

export interface UpdateTaskData {
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  assignedToId?: string;
}

export async function getTasks(
  params: TaskListParams = {},
): Promise<PaginatedTasksResponse> {
  const res = await api.get("/tasks", { params });
  return res.data;
}

export async function getTaskById(id: string): Promise<{ task: Task }> {
  const res = await api.get(`/tasks/${id}`);
  return res.data;
}

export async function createTask(
  data: CreateTaskData,
): Promise<{ task: Task }> {
  const res = await api.post("/tasks", data);
  return res.data;
}

export async function updateTask(
  id: string,
  data: UpdateTaskData,
): Promise<{ task: Task }> {
  const res = await api.put(`/tasks/${id}`, data);
  return res.data;
}

export async function completeTask(id: string): Promise<{ task: Task }> {
  const res = await api.post(`/tasks/${id}/complete`);
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
