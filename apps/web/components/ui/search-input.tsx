"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** External (debounced) value. When it changes from outside, the local input syncs. */
  value: string;
  /** Called with the debounced value. */
  onChange: (value: string) => void;
  /** Required for accessibility. Describes what the search targets. */
  "aria-label": string;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** When true, a clear (×) button appears once there's input. Default true. */
  showClear?: boolean;
}

export function SearchInput({
  value,
  onChange,
  "aria-label": ariaLabel,
  placeholder,
  debounceMs = 400,
  disabled,
  autoFocus,
  className,
  showClear = true,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const commit = useCallback(
    (next: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(next);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onChange("");
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={localValue}
        onChange={(e) => {
          const next = e.target.value;
          setLocalValue(next);
          commit(next);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn("pl-8", showClear && localValue ? "pr-8" : undefined)}
      />
      {showClear && localValue && !disabled && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleClear}
          aria-label={`Clear ${ariaLabel.toLowerCase()}`}
          className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
