import api from "@/lib/axios";

export type ActivityType = "CALL" | "MEETING";

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
  const res = await api.get<{ data?: { activities: Activity[] } }>(
    `/activities/contact/${contactId}`,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function getActivitiesByDeal(
  dealId: string,
): Promise<{ activities: Activity[] }> {
  const res = await api.get<{ data?: { activities: Activity[] } }>(
    `/activities/deal/${dealId}`,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
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
  const res = await api.post<{ data?: { activity: Activity } }>(
    "/activities",
    data,
  );
  const payload = res.data?.data;
  if (!payload) throw new Error("Invalid response from server");
  return payload;
}

export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`);
}
