"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface BooleanFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  helpText?: string;
}

export function BooleanField({
  value,
  onChange,
  label,
  helpText,
}: BooleanFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        {label && (
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium cursor-pointer">
              {label}
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
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
