import api from "@/lib/axios";

export interface RemarketingSequence {
  id: string;
  tenantId: string;
  contactId: string;
  dealId: string | null;
  sequenceDay: number;
  message: string | null;
  scheduledAt: string;
  executedAt: string | null;
  status: "PENDING" | "EXECUTED" | "SKIPPED" | "PAUSED";
  createdAt: string;
}

export async function getSequencesByContact(
  contactId: string,
): Promise<RemarketingSequence[]> {
  const res = await api.get(`/contacts/${contactId}/remarketing-sequences`);
  return res.data.sequences ?? [];
}

export async function getSequencesByDeal(
  dealId: string,
): Promise<RemarketingSequence[]> {
  const res = await api.get(`/deals/${dealId}/remarketing-sequences`);
  return res.data.sequences ?? [];
}
