// Pipeline stage colors. The backend Pipeline.stages JSON does not (yet) carry
// a per-stage color, so we derive a distinct color from the stage's position
// using the functional --stage-* palette. The default framework pipelines are
// ordered New → Qualified → Proposal → Negotiation → Won → Lost, which lines up
// with this palette. If the backend ever provides a stage.color, prefer it.
const STAGE_PALETTE = [
  "hsl(var(--stage-new))",
  "hsl(var(--stage-qualified))",
  "hsl(var(--stage-proposal))",
  "hsl(var(--stage-negotiation))",
  "hsl(var(--stage-won))",
  "hsl(var(--stage-lost))",
] as const;

/** Distinct stage color by position, cycling the --stage-* palette. */
export function stageColorByIndex(index: number): string {
  return STAGE_PALETTE[index % STAGE_PALETTE.length] as string;
}

/** Prefer an explicit stage color when present, else derive from position. */
export function resolveStageColor(
  color: string | null | undefined,
  index: number,
): string {
  return color && color.trim() ? color : stageColorByIndex(index);
}
