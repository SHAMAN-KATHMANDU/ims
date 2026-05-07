"use client";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface SliderFieldProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function SliderField({
  value,
  onChange,
  label,
  helpText,
  min = 0,
  max = 100,
  step = 1,
}: SliderFieldProps) {
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
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm font-medium w-12 text-right">{value}</span>
      </div>
    </div>
  );
}
