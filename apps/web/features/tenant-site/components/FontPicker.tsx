"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const CURATED_FONTS: { family: string; category: string }[] = [
  { family: "Inter", category: "Sans-serif" },
  { family: "Roboto", category: "Sans-serif" },
  { family: "Open Sans", category: "Sans-serif" },
  { family: "Lato", category: "Sans-serif" },
  { family: "Nunito", category: "Sans-serif" },
  { family: "Poppins", category: "Sans-serif" },
  { family: "DM Sans", category: "Sans-serif" },
  { family: "Outfit", category: "Sans-serif" },
  { family: "Plus Jakarta Sans", category: "Sans-serif" },
  { family: "Space Grotesk", category: "Sans-serif" },
  { family: "Syne", category: "Sans-serif" },
  { family: "Playfair Display", category: "Serif" },
  { family: "Lora", category: "Serif" },
  { family: "Merriweather", category: "Serif" },
  { family: "EB Garamond", category: "Serif" },
  { family: "Cormorant", category: "Serif" },
  { family: "Libre Baskerville", category: "Serif" },
  { family: "Crimson Pro", category: "Serif" },
  { family: "Oswald", category: "Display" },
  { family: "Raleway", category: "Display" },
  { family: "Bebas Neue", category: "Display" },
  { family: "Urbanist", category: "Display" },
  { family: "JetBrains Mono", category: "Monospace" },
  { family: "Fira Code", category: "Monospace" },
  { family: "Space Mono", category: "Monospace" },
];

let googleFontsInjected = false;

function injectGoogleFonts() {
  if (googleFontsInjected || typeof document === "undefined") return;
  googleFontsInjected = true;
  const families = CURATED_FONTS.map(
    (f) => `family=${f.family.replace(/ /g, "+")}`,
  ).join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

interface FontPickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function FontPicker({
  value,
  onChange,
  placeholder = "System default",
  disabled,
  id,
}: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) injectGoogleFonts();
  }, [open]);

  const trimmedSearch = search.trim();

  const filtered = trimmedSearch
    ? CURATED_FONTS.filter((f) =>
        f.family.toLowerCase().includes(trimmedSearch.toLowerCase()),
      )
    : CURATED_FONTS;

  const groups = filtered.reduce<Record<string, typeof CURATED_FONTS>>(
    (acc, f) => {
      (acc[f.category] ??= []).push(f);
      return acc;
    },
    {},
  );

  const isCustomInput =
    trimmedSearch.length > 0 &&
    !CURATED_FONTS.some(
      (f) => f.family.toLowerCase() === trimmedSearch.toLowerCase(),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {value ? (
            <span style={{ fontFamily: `'${value}', sans-serif` }}>
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search fonts…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No font found.</CommandEmpty>

            {Object.entries(groups).map(([category, fonts]) => (
              <CommandGroup key={category} heading={category}>
                {fonts.map((f) => (
                  <CommandItem
                    key={f.family}
                    value={f.family}
                    onSelect={() => {
                      onChange(value === f.family ? "" : f.family);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === f.family ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                      <span
                        className="truncate text-[15px] leading-snug"
                        style={{ fontFamily: `'${f.family}', sans-serif` }}
                      >
                        {f.family}
                      </span>
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        style={{ fontFamily: `'${f.family}', sans-serif` }}
                        aria-hidden="true"
                      >
                        Aa
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {isCustomInput && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={trimmedSearch}
                  onSelect={() => {
                    onChange(trimmedSearch);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value?.toLowerCase() === trimmedSearch.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span
                    className="flex-1"
                    style={{ fontFamily: `'${trimmedSearch}', sans-serif` }}
                  >
                    Use &ldquo;{trimmedSearch}&rdquo;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
