"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function CategoryPicker({
  value,
  onChange,
  label,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
          readOnly
          placeholder="No category selected"
          className="text-sm bg-muted"
        />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="shrink-0"
          >
            <Plus size={16} className="mr-1" /> Choose
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select a category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm"
              />
              <div className="text-sm text-muted-foreground">
                Category picker coming in Phase 4
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
