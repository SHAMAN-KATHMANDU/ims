"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, AlertCircle } from "lucide-react";

interface JsonFallbackFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  label?: string;
  helpText?: string;
}

export function JsonFallbackField({
  value,
  onChange,
  label,
  helpText,
}: JsonFallbackFieldProps) {
  const jsonString = JSON.stringify(value, null, 2);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value);
      onChange(parsed);
    } catch {
      // Invalid JSON — show error but don't update until valid
    }
  };

  return (
    <div className="space-y-1.5" data-testid="json-fallback-field">
      <div className="flex items-start gap-1.5">
        <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
        {label && (
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium text-amber-900">
              {label} (Custom JSON)
            </Label>
            {helpText && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={14}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent>{helpText}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
      <Textarea
        value={jsonString}
        onChange={handleChange}
        placeholder="Enter JSON"
        className="text-xs font-mono resize-none bg-amber-50 border-amber-200"
        rows={6}
      />
      <p className="text-xs text-muted-foreground">
        This field type is not fully supported in the inspector. Edit the JSON
        directly.
      </p>
    </div>
  );
}
