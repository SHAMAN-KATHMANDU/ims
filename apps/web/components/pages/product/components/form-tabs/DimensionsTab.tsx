"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductFormValues } from "../../types"
import type { UseFormReturn } from "@/hooks/useForm"

interface DimensionsTabProps {
  form: UseFormReturn<ProductFormValues>
}

export function DimensionsTab({ form }: DimensionsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="length">Length (cm)</Label>
        <Input
          id="length"
          type="number"
          value={form.values.length}
          onChange={(e) => form.handleChange("length", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="breadth">Breadth (cm)</Label>
        <Input
          id="breadth"
          type="number"
          value={form.values.breadth}
          onChange={(e) => form.handleChange("breadth", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="height">Height (cm)</Label>
        <Input
          id="height"
          type="number"
          value={form.values.height}
          onChange={(e) => form.handleChange("height", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="weight">Weight (kg)</Label>
        <Input
          id="weight"
          type="number"
          step="0.01"
          value={form.values.weight}
          onChange={(e) => form.handleChange("weight", e.target.value)}
        />
      </div>
    </div>
  )
}

