"use client";

import { Label } from "@/components/ui/label";
import { NumberField } from "../auto-form/fields/NumberField";

interface SpacingControlsProps {
  style: Record<string, unknown>;
  onChange: (style: Record<string, unknown>) => void;
}

const SPACING_OPTIONS = [
  { key: "paddingTop", label: "Padding top" },
  { key: "paddingRight", label: "Padding right" },
  { key: "paddingBottom", label: "Padding bottom" },
  { key: "paddingLeft", label: "Padding left" },
  { key: "marginTop", label: "Margin top" },
  { key: "marginRight", label: "Margin right" },
  { key: "marginBottom", label: "Margin bottom" },
  { key: "marginLeft", label: "Margin left" },
];

export function SpacingControls({ style, onChange }: SpacingControlsProps) {
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
        Spacing
      </Label>
      <div className="grid grid-cols-2 gap-3">
        {SPACING_OPTIONS.map((option) => (
          <NumberField
            key={option.key}
            label={option.label}
            value={(style[option.key] as number) || 0}
            onChange={(val) => handleChange(option.key, val)}
            min={0}
            max={200}
            step={4}
          />
        ))}
      </div>
    </div>
  );
}
