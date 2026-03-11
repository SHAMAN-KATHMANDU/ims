import api from "@/lib/axios";

export type ActivityType = "CALL" | "EMAIL" | "MEETING";

export interface Activity {
  id: string;
  type: ActivityType;
  subject?: string | null;
  notes?: string | null;
  activityAt: string;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  createdById: string;
  createdAt: string;
  contact?: { id: string; firstName: string; lastName?: string | null } | null;
  member?: { id: string; name: string | null; phone: string } | null;
  deal?: { id: string; name: string } | null;
  creator?: { id: string; username: string };
}

export async function getActivitiesByContact(
  contactId: string,
): Promise<{ activities: Activity[] }> {
  const res = await api.get(`/activities/contact/${contactId}`);
  return res.data;
}

export async function getActivitiesByDeal(
  dealId: string,
): Promise<{ activities: Activity[] }> {
  const res = await api.get(`/activities/deal/${dealId}`);
  return res.data;
}

export async function createActivity(data: {
  type: ActivityType;
  subject?: string;
  notes?: string;
  activityAt?: string;
  contactId?: string;
  memberId?: string;
  dealId?: string;
}): Promise<{ activity: Activity }> {
  const res = await api.post("/activities", data);
  return res.data;
}

export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`);
}
