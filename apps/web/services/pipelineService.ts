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
  const res = await api.get("/pipelines");
  return res.data;
}

export async function getPipelineById(
  id: string,
): Promise<{ pipeline: Pipeline }> {
  const res = await api.get(`/pipelines/${id}`);
  return res.data;
}

export async function createPipeline(data: {
  name: string;
  stages?: PipelineStage[];
  isDefault?: boolean;
}): Promise<{ pipeline: Pipeline }> {
  const res = await api.post("/pipelines", data);
  return res.data;
}

export async function updatePipeline(
  id: string,
  data: { name?: string; stages?: PipelineStage[]; isDefault?: boolean },
): Promise<{ pipeline: Pipeline }> {
  const res = await api.put(`/pipelines/${id}`, data);
  return res.data;
}

export async function deletePipeline(id: string): Promise<void> {
  await api.delete(`/pipelines/${id}`);
}
