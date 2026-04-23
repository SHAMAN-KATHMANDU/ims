"use client";

import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import type { ProductFormValues } from "../types";
import type { UseFormReturn } from "@/hooks/useForm";

interface DimensionsTabProps {
  form: UseFormReturn<ProductFormValues>;
}

export function DimensionsTab({ form }: DimensionsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="length">Length (cm)</Label>
        <NumericInput
          id="length"
          value={form.values.length}
          onChange={(v) => form.handleChange("length", v)}
          allowDecimals
          min={0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="breadth">Breadth (cm)</Label>
        <NumericInput
          id="breadth"
          value={form.values.breadth}
          onChange={(v) => form.handleChange("breadth", v)}
          allowDecimals
          min={0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="height">Height (cm)</Label>
        <NumericInput
          id="height"
          value={form.values.height}
          onChange={(v) => form.handleChange("height", v)}
          allowDecimals
          min={0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Weight (kg)</Label>
        <NumericInput
          id="weight"
          value={form.values.weight}
          onChange={(v) => form.handleChange("weight", v)}
          allowDecimals
          min={0}
        />
      </div>
    </div>
  );
}
