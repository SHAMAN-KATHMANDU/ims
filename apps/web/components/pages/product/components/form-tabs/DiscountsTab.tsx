"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Trash2, Plus } from "lucide-react"
import type { ProductDiscountForm } from "../../types"

interface DiscountsTabProps {
  discounts: ProductDiscountForm[]
  discountTypes: Array<{ id: string; name: string }>
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: "discountTypeName" | "discountPercentage" | "startDate" | "endDate" | "isActive", value: string | boolean) => void
}

export function DiscountsTab({
  discounts,
  discountTypes,
  onAdd,
  onRemove,
  onUpdate,
}: DiscountsTabProps) {
  const defaultTypes = ["General", "Special", "Member", "Wholesale"]

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Discounts</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="gap-1"
        >
          <Plus className="h-3 w-3" /> Add Discount
        </Button>
      </div>
      {discounts.length > 0 && (
        <div className="space-y-4 border rounded-lg p-4">
          {/* Sort discounts: defaults first, then others */}
          {discounts
            .map((discount, originalIndex) => ({ discount, originalIndex }))
            .sort((a, b) => {
              const aIsDefault = defaultTypes.includes(a.discount.discountTypeName)
              const bIsDefault = defaultTypes.includes(b.discount.discountTypeName)
              if (aIsDefault && !bIsDefault) return -1
              if (!aIsDefault && bIsDefault) return 1
              return 0
            })
            .map(({ discount, originalIndex: index }) => {
              const isDefault = defaultTypes.includes(discount.discountTypeName)
              
              return (
                <div key={`${discount.discountTypeName}-${index}`} className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0">
                  {isDefault && (
                    <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded w-fit">
                      Default Discount
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`disc-type-${index}`} className="text-xs">Discount Type *</Label>
                      <Select
                        value={discount.discountTypeName}
                        onValueChange={(value) => onUpdate(index, "discountTypeName", value)}
                      >
                        <SelectTrigger id={`disc-type-${index}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {discountTypes.length > 0 ? (
                            discountTypes.map((dt) => (
                              <SelectItem key={dt.id} value={dt.name}>
                                {dt.name}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Special">Special</SelectItem>
                              <SelectItem value="Member">Member</SelectItem>
                              <SelectItem value="Wholesale">Wholesale</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`disc-percent-${index}`} className="text-xs">Discount % *</Label>
                      <Input
                        id={`disc-percent-${index}`}
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discount.discountPercentage}
                        onChange={(e) => onUpdate(index, "discountPercentage", e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Switch
                          id={`disc-active-${index}`}
                          checked={discount.isActive}
                          onCheckedChange={(checked) => onUpdate(index, "isActive", checked)}
                        />
                        <Label htmlFor={`disc-active-${index}`} className="text-xs cursor-pointer">Active</Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(index)}
                        className="mb-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Dates (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {discount.startDate || discount.endDate 
                            ? `${discount.startDate || "Start"} - ${discount.endDate || "End"}`
                            : "Select dates"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Start Date</Label>
                            <Input
                              type="date"
                              value={discount.startDate}
                              onChange={(e) => onUpdate(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">End Date</Label>
                            <Input
                              type="date"
                              value={discount.endDate}
                              min={discount.startDate || undefined}
                              onChange={(e) => onUpdate(index, "endDate", e.target.value)}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )
            })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Default discounts are automatically added. You can modify or remove them as needed.
      </p>
    </div>
  )
}

