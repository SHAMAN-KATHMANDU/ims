import api from "@/lib/axios";

export interface PipelineStage {
  id: string;
  name: string;
  order?: number;
  probability?: number;
}

export type PipelineType =
  | "GENERAL"
  | "NEW_SALES"
  | "REMARKETING"
  | "REPURCHASE";

export interface Pipeline {
  id: string;
  name: string;
  type: PipelineType;
  stages: PipelineStage[];
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

export interface SeedFrameworkResult {
  pipelines: Array<{ id: string; name: string; type: PipelineType }>;
  journeyTypes: string[];
  tags: string[];
}

export async function seedPipelineFramework(): Promise<SeedFrameworkResult> {
  const res = await api.post("/pipelines/seed-framework");
  return res.data;
}
