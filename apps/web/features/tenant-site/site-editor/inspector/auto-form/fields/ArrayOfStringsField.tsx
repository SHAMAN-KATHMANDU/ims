"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, X } from "lucide-react";

interface ArrayOfStringsFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  helpText?: string;
}

export function ArrayOfStringsField({
  value,
  onChange,
  label,
  helpText,
}: ArrayOfStringsFieldProps) {
  const addItem = () => {
    onChange([...value, ""]);
  };

  const updateItem = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

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
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="text-sm flex-1"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeItem(index)}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={addItem}
          className="w-full"
        >
          Add item
        </Button>
      </div>
    </div>
  );
}
