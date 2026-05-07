"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({
  value,
  onChange,
  label,
  helpText,
  min,
  max,
  step,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        placeholder={label ? undefined : "Enter number"}
        className="text-sm"
      />
    </div>
  );
}
