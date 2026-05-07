"use client";

import { Label } from "@/components/ui/label";
import { ColorField } from "../auto-form/fields/ColorField";
import { StringField } from "../auto-form/fields/StringField";

interface BackgroundControlsProps {
  style: Record<string, unknown>;
  onChange: (style: Record<string, unknown>) => void;
}

export function BackgroundControls({
  style,
  onChange,
}: BackgroundControlsProps) {
  const handleChange = (key: string, value: string) => {
    const updated = { ...style };
    if (!value) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Background
      </Label>
      <ColorField
        label="Background color"
        value={(style.backgroundColor as string) || ""}
        onChange={(val) => handleChange("backgroundColor", val)}
      />
      <StringField
        label="Background image URL"
        value={(style.backgroundImage as string) || ""}
        onChange={(val) => handleChange("backgroundImage", val)}
      />
    </div>
  );
}
