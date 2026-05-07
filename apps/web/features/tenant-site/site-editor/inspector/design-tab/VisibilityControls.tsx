"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface VisibilityControlsProps {
  visibility: Record<string, unknown>;
  onChange: (visibility: Record<string, unknown>) => void;
}

const DEVICE_OPTIONS = [
  { key: "mobile", label: "Hide on mobile" },
  { key: "tablet", label: "Hide on tablet" },
  { key: "desktop", label: "Hide on desktop" },
];

export function VisibilityControls({
  visibility,
  onChange,
}: VisibilityControlsProps) {
  const handleToggle = (key: string) => {
    const updated = { ...visibility };
    if (updated[key]) {
      delete updated[key];
    } else {
      updated[key] = true;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Visibility
      </Label>
      <div className="space-y-2">
        {DEVICE_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center gap-2">
            <Checkbox
              id={`visibility-${option.key}`}
              checked={!!visibility[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
            />
            <Label
              htmlFor={`visibility-${option.key}`}
              className="text-sm cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
