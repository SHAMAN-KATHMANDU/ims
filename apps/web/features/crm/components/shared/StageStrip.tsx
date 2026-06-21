import { cn } from "@/lib/utils";

export interface StageStripStage {
  id: string;
  name: string;
  /** CSS color from backend Pipeline.stages[].color (hex or hsl). */
  color: string;
}

/**
 * Horizontal stage progress strip for the deal detail page (Helm design):
 * stages up to and including the current one are tinted; the current stage is
 * filled solid; later stages are muted.
 */
export function StageStrip({
  stages,
  currentStage,
  className,
}: {
  stages: StageStripStage[];
  currentStage: string;
  className?: string;
}) {
  const currentIdx = stages.findIndex((s) => s.name === currentStage);
  return (
    <div className={cn("flex gap-1.5", className)}>
      {stages.map((s, i) => {
        const active = i <= currentIdx;
        const current = s.name === currentStage;
        return (
          <div
            key={s.id}
            className="flex h-[34px] flex-1 items-center justify-center rounded-lg border px-1 text-center text-[11.5px] font-semibold"
            style={{
              background: current
                ? s.color
                : active
                  ? `color-mix(in srgb, ${s.color} 16%, var(--card))`
                  : "var(--secondary)",
              borderColor: current ? s.color : "var(--border)",
              color: current
                ? "#fff"
                : active
                  ? s.color
                  : "var(--muted-foreground)",
            }}
            title={s.name}
          >
            <span className="truncate">{s.name}</span>
          </div>
        );
      })}
    </div>
  );
}
