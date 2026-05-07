"use client";

import { Label } from "@/components/ui/label";
import { NumberField } from "../auto-form/fields/NumberField";

interface BorderRadiusControlsProps {
  style: Record<string, unknown>;
  onChange: (style: Record<string, unknown>) => void;
}

const RADIUS_OPTIONS = [
  { key: "borderRadius", label: "All corners" },
  { key: "borderTopLeftRadius", label: "Top left" },
  { key: "borderTopRightRadius", label: "Top right" },
  { key: "borderBottomLeftRadius", label: "Bottom left" },
  { key: "borderBottomRightRadius", label: "Bottom right" },
];

export function BorderRadiusControls({
  style,
  onChange,
}: BorderRadiusControlsProps) {
  const handleChange = (key: string, value: number) => {
    const updated = { ...style };
    if (value === 0) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Border Radius
      </Label>
      <div className="grid grid-cols-2 gap-3">
        {RADIUS_OPTIONS.map((option) => (
          <NumberField
            key={option.key}
            label={option.label}
            value={(style[option.key] as number) || 0}
            onChange={(val) => handleChange(option.key, val)}
            min={0}
            max={100}
            step={2}
          />
        ))}
      </div>
    </div>
  );
}
