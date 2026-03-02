import api from "@/lib/axios";

export interface CrmSource {
  id: string;
  name: string;
  createdAt: string;
}

export async function getCrmSources(): Promise<{ sources: CrmSource[] }> {
  const res = await api.get("/crm-settings/sources");
  return res.data;
}

export async function createCrmSource(
  name: string,
): Promise<{ source: CrmSource }> {
  const res = await api.post("/crm-settings/sources", { name });
  return res.data;
}

export async function updateCrmSource(
  id: string,
  name: string,
): Promise<{ source: CrmSource }> {
  const res = await api.put(`/crm-settings/sources/${id}`, { name });
  return res.data;
}

export async function deleteCrmSource(id: string): Promise<void> {
  await api.delete(`/crm-settings/sources/${id}`);
}
