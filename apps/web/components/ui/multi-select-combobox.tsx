"use client";

import * as React from "react";
import { Check, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectComboboxOption {
  value: string;
  label: string;
}

export interface MultiSelectComboboxProps {
  options: MultiSelectComboboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = "Add...",
  emptyMessage = "No results found",
  disabled = false,
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const exists = selected.includes(value);
    if (exists) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== value));
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {selectedLabels.map((label) => {
        const value = options.find((o) => o.label === label)?.value ?? label;
        return (
          <Badge
            key={value}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            <span className="truncate max-w-[120px]">{label}</span>
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => handleRemove(e, value)}
              aria-label={`Remove ${label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={disabled}
            aria-label={placeholder}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(90vw,280px)] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => handleToggle(opt.value)}
                    >
                      {isSelected ? (
                        <Check className="mr-2 h-4 w-4 shrink-0" />
                      ) : (
                        <span className="mr-2 h-4 w-4 shrink-0 w-4" />
                      )}
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
