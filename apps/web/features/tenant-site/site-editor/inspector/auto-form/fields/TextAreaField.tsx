"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface TextAreaFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  maxLength?: number;
}

export function TextAreaField({
  value,
  onChange,
  label,
  helpText,
  maxLength,
}: TextAreaFieldProps) {
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
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={label ? undefined : "Enter value"}
        className="text-sm resize-none"
        rows={4}
      />
    </div>
  );
}
