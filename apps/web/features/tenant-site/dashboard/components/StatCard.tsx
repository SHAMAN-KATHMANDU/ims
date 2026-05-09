import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  tone: "success" | "warning" | "info" | "danger" | "muted";
  sparkline: number[];
}

export function StatCard({
  label,
  value,
  delta,
  tone,
  sparkline,
}: StatCardProps) {
  const toneColors: Record<string, { bg: string; stroke: string }> = {
    success: {
      bg: "oklch(from var(--success) l c h / 0.08)",
      stroke: "var(--success)",
    },
    warning: {
      bg: "oklch(from var(--warn) l c h / 0.08)",
      stroke: "var(--warn)",
    },
    info: {
      bg: "oklch(from var(--info) l c h / 0.08)",
      stroke: "var(--info)",
    },
    danger: {
      bg: "oklch(from var(--danger) l c h / 0.08)",
      stroke: "var(--danger)",
    },
    muted: {
      bg: "oklch(from var(--ink-4) l c h / 0.08)",
      stroke: "var(--ink-3)",
    },
  };

  const colors = toneColors[tone] || toneColors.muted;

  const generateSparklinePath = (values: number[], w = 120, h = 28) => {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const sx = (i: number) => (i / (values.length - 1)) * w;
    const sy = (v: number) => h - ((v - min) / range) * (h - 2) - 1;

    const d = values
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`,
      )
      .join(" ");
    const dArea = `${d} L${w} ${h} L0 ${h} Z`;

    return { d, dArea };
  };

  const { d, dArea } = generateSparklinePath(sparkline);

  return (
    <Card className="p-2">
      <div
        className="mono mb-2 text-xs uppercase tracking-wider"
        style={{ color: "var(--ink-4)" }}
      >
        {label}
      </div>
      <div className="mb-1 flex items-baseline justify-between">
        <div
          className="text-2xl font-semibold"
          style={{ letterSpacing: "-0.5px" }}
        >
          {value}
        </div>
        <Badge
          variant={tone === "muted" ? "secondary" : "default"}
          className="text-xs"
        >
          {delta}
        </Badge>
      </div>
      <svg
        viewBox="0 0 120 28"
        width="100%"
        height="28"
        preserveAspectRatio="none"
      >
        <path d={dArea} fill={colors?.bg} opacity={0.5} />
        <path d={d} fill="none" stroke={colors?.stroke} strokeWidth="1.4" />
      </svg>
    </Card>
  );
}
