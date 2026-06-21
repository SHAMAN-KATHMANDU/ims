"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompact } from "../../utils/format";

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

/**
 * Pipeline funnel — recharts horizontal bars, one bar per stage (Helm design).
 * Stage colors come from `colors` (resolved from pipeline data) when provided,
 * otherwise fall back to the functional --stage-* palette by position.
 */
const STAGE_PALETTE = [
  "hsl(var(--stage-new))",
  "hsl(var(--stage-qualified))",
  "hsl(var(--stage-proposal))",
  "hsl(var(--stage-negotiation))",
  "hsl(var(--stage-won))",
  "hsl(var(--stage-lost))",
];

export function PipelineFunnel({
  stages,
  height = 260,
  colors,
}: {
  stages: FunnelStage[];
  height?: number;
  colors?: string[];
}) {
  if (!stages.length) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No pipeline data yet.
      </div>
    );
  }
  const data = stages.map((s, i) => ({
    ...s,
    fill: colors?.[i] ?? STAGE_PALETTE[i % STAGE_PALETTE.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="stage"
          width={96}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(value: number, _name, item) => [
            `${value} deals · ${formatCompact(
              (item?.payload as FunnelStage | undefined)?.value ?? 0,
            )}`,
            "Deals",
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
