import api from "@/lib/axios";

export interface CrmSource {
  id: string;
  name: string;
  createdAt: string;
}

export interface CrmJourneyType {
  id: string;
  name: string;
  createdAt: string;
}

// ── Sources ──────────────────────────────────────────────────────────────────

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

// ── Journey Types ─────────────────────────────────────────────────────────────

export async function getCrmJourneyTypes(): Promise<{
  journeyTypes: CrmJourneyType[];
}> {
  const res = await api.get("/crm-settings/journey-types");
  return res.data;
}

export async function createCrmJourneyType(
  name: string,
): Promise<{ journeyType: CrmJourneyType }> {
  const res = await api.post("/crm-settings/journey-types", { name });
  return res.data;
}

export async function updateCrmJourneyType(
  id: string,
  name: string,
): Promise<{ journeyType: CrmJourneyType }> {
  const res = await api.put(`/crm-settings/journey-types/${id}`, { name });
  return res.data;
}

export async function deleteCrmJourneyType(id: string): Promise<void> {
  await api.delete(`/crm-settings/journey-types/${id}`);
}
