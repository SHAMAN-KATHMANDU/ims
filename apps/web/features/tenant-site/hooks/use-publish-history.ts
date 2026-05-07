import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface PublishHistoryEntry {
  id: string;
  publishedAt: string;
  publishedBy?: string;
  summary?: string;
}

async function getPublishHistory(): Promise<PublishHistoryEntry[]> {
  try {
    const res = await api.get<{
      data: { history: PublishHistoryEntry[] };
    }>("/sites/publish-history");
    return res.data.data?.history ?? [];
  } catch (error) {
    handleApiError(error, "fetch publish history");
    return [];
  }
}

async function rollbackPublish(versionId: string): Promise<void> {
  try {
    await api.post("/sites/publish-rollback", { versionId });
  } catch (error) {
    handleApiError(error, "rollback publish");
    throw error;
  }
}

export function usePublishHistory() {
  return useQuery({
    queryKey: ["publish-history"],
    queryFn: () => getPublishHistory(),
  });
}

export function useRollbackPublish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => rollbackPublish(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      queryClient.invalidateQueries({ queryKey: ["publish-history"] });
    },
  });
}
