export function getActiveJourneyType(
  deals:
    | Array<{
        stage: string;
        status: string;
        pipeline?: { name: string | null } | null;
      }>
    | undefined,
  /**
   * A stored journey type set directly on the contact. When present it wins
   * over the value derived from the active deal — the API already resolves
   * "stored-if-valid, else derived", so any non-empty value here is authoritative.
   */
  storedJourneyType?: string | null,
): string | null {
  const stored = storedJourneyType?.trim();
  if (stored) return stored;
  const activeDeal = deals?.find((deal) => deal.status === "OPEN");
  const pipelineName = activeDeal?.pipeline?.name?.trim();
  const stageName = activeDeal?.stage?.trim();
  if (!pipelineName || !stageName) {
    return null;
  }
  return `${pipelineName}(${stageName})`;
}
