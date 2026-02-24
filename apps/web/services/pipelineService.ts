import api from "@/lib/axios";

export interface PipelineStage {
  id: string;
  name: string;
  order?: number;
  probability?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[] | unknown;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deals: number };
}

export async function getPipelines(): Promise<{ pipelines: Pipeline[] }> {
  const res = await api.get<{ data?: { pipelines: Pipeline[] } }>("/pipelines");
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function getPipelineById(
  id: string,
): Promise<{ pipeline: Pipeline }> {
  const res = await api.get<{ data?: { pipeline: Pipeline } }>(
    `/pipelines/${id}`,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function createPipeline(data: {
  name: string;
  stages?: PipelineStage[];
  isDefault?: boolean;
}): Promise<{ pipeline: Pipeline }> {
  const res = await api.post<{ data?: { pipeline: Pipeline } }>(
    "/pipelines",
    data,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function updatePipeline(
  id: string,
  data: { name?: string; stages?: PipelineStage[]; isDefault?: boolean },
): Promise<{ pipeline: Pipeline }> {
  const res = await api.put<{ data?: { pipeline: Pipeline } }>(
    `/pipelines/${id}`,
    data,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deletePipeline(id: string): Promise<void> {
  await api.delete(`/pipelines/${id}`);
}
