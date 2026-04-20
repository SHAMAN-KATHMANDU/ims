"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  includeAll?: boolean;
  allLabel?: string;
  /** Value for the "All" option when includeAll is true. Default "". */
  allValue?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyMessage = "No results found",
  includeAll = false,
  allLabel = "All",
  allValue = "",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const displayOptions = React.useMemo(() => {
    if (!includeAll) return options;
    return [{ value: allValue, label: allLabel }, ...options];
  }, [options, includeAll, allLabel, allValue]);

  const selectedLabel =
    value === allValue
      ? allLabel
      : (options.find((o) => o.value === value)?.label ?? value);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {value === "" && !includeAll ? placeholder : selectedLabel}
          </span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,280px)] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {displayOptions.map((opt) => {
                const isSelected =
                  opt.value === value ||
                  (value === allValue && opt.value === allValue && includeAll);
                return (
                  <CommandItem
                    key={opt.value === allValue ? "__all__" : opt.value}
                    value={opt.label}
                    onSelect={() => handleSelect(opt.value)}
                  >
                    {isSelected ? (
                      <Check
                        className="mr-2 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
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
  );
}
