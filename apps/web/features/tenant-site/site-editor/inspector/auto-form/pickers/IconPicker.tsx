"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="icon name or slug"
          className="text-sm flex-1"
        />
        <Button size="sm" variant="outline" className="shrink-0">
          <Plus size={16} className="mr-1" /> Browse
        </Button>
        {value && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange("")}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Icon picker coming in Phase 4
      </p>
    </div>
  );
}
