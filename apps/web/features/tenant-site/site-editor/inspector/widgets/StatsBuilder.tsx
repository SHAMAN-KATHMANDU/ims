"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface Stat {
  value: string;
  label: string;
}

const StatSchema = z.object({
  value: z.string().max(40),
  label: z.string().max(80),
});

interface StatsBuilderProps {
  value: Stat[];
  onChange: (stats: Stat[]) => void;
  label?: string;
}

export function StatsBuilder({
  value,
  onChange,
  label = "Statistics",
}: StatsBuilderProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <ArrayBuilder
        value={value}
        onChange={onChange}
        renderRow={(item, index) => (
          <AutoForm
            schema={StatSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="stats-band"
          />
        )}
        renderCollapsedTitle={(item) => `${item.value} ${item.label}`}
        addLabel="Add stat"
        blockKind="stats-builder"
      />
    </div>
  );
}
