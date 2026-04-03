export function getActiveJourneyType(
  deals:
    | Array<{
        stage: string;
        status: string;
        pipeline?: { name: string | null } | null;
      }>
    | undefined,
): string | null {
  const activeDeal = deals?.find((deal) => deal.status === "OPEN");
  const pipelineName = activeDeal?.pipeline?.name?.trim();
  const stageName = activeDeal?.stage?.trim();
  if (!pipelineName || !stageName) {
    return null;
  }
  return `${pipelineName}(${stageName})`;
}
