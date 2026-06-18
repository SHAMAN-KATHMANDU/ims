"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StaffActivityChartProps {
  data: Array<{
    username: string;
    calls: number;
    emails: number;
    meetings: number;
  }>;
}

export function StaffActivityChart({ data }: StaffActivityChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  const chartData = data.map((staff) => ({
    ...staff,
    firstName: staff.username.split(" ")[0],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <XAxis dataKey="firstName" tick={{ fill: "var(--muted-foreground)" }} />
        <YAxis />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend />
        <Bar
          dataKey="calls"
          name="Calls"
          fill="var(--info)"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="emails"
          name="Emails"
          fill="var(--primary)"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="meetings"
          name="Meetings"
          fill="hsl(var(--stage-proposal))"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
