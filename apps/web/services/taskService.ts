import api from "@/lib/axios";
import type { PaginationMeta } from "@/lib/apiTypes";
import { DEFAULT_PAGINATION_META } from "@/lib/apiTypes";

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
  const res = await api.get<{ data?: Task[]; pagination?: PaginationMeta }>(
    "/tasks",
    { params },
  );
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? DEFAULT_PAGINATION_META,
  };
}

export async function getTaskById(id: string): Promise<{ task: Task }> {
  const res = await api.get<{ data?: { task: Task } }>(`/tasks/${id}`);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createTask(
  data: CreateTaskData,
): Promise<{ task: Task }> {
  const res = await api.post<{ data?: { task: Task } }>("/tasks", data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updateTask(
  id: string,
  data: UpdateTaskData,
): Promise<{ task: Task }> {
  const res = await api.put<{ data?: { task: Task } }>(`/tasks/${id}`, data);
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function completeTask(id: string): Promise<{ task: Task }> {
  const res = await api.post<{ data?: { task: Task } }>(
    `/tasks/${id}/complete`,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
