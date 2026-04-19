"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parseAndValidatePhone,
  parseE164ToCountryAndNational,
  type CountryCode,
} from "@/lib/phone";
import { Input } from "@/components/ui/input";
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
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";

const DEFAULT_COUNTRY: CountryCode = "NP";

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

function getCountryLabel(country: CountryCode): string {
  try {
    const name = countryDisplayNames.of(country) ?? country;
    const code = getCountryCallingCode(country);
    return `${name} +${code}`;
  } catch {
    return `${country} +${getCountryCallingCode(country)}`;
  }
}

function FlagIcon({ country }: { country: CountryCode }) {
  if (!hasFlag(country)) return null;
  const Flag = (
    Flags as Record<
      string,
      React.ComponentType<{ title?: string; className?: string }>
    >
  )[country];
  if (!Flag) return null;
  return (
    <Flag
      title={countryDisplayNames.of(country) ?? country}
      className="h-4 w-4 rounded-sm object-cover shrink-0"
    />
  );
}

export interface PhoneInputProps {
  /** Current value as E.164 (e.g. +9779841234567). Empty string when no phone. */
  value: string;
  /** Called with E.164 when valid, or attempted E.164 when invalid (so form validation can fail). */
  onChange: (e164: string) => void;
  /** Optional. Called when the number input loses focus. */
  onBlur?: () => void;
  /** Optional. When value is empty, this country is pre-selected. */
  defaultCountry?: CountryCode;
  required?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Label id for the number input (e.g. "phone-number"). */
  numberInputId?: string;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  defaultCountry = DEFAULT_COUNTRY,
  required = false,
  error,
  disabled,
  placeholder = "Phone number",
  id,
  className,
  numberInputId,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [nationalNumber, setNationalNumber] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const lastValueRef = useRef<string>(value);

  const countryOptions = useMemo(() => {
    const list = getCountries();
    return [...list].sort((a, b) =>
      getCountryLabel(a).localeCompare(getCountryLabel(b)),
    );
  }, []);

  useEffect(() => {
    if (value?.trim()) {
      const parsed = parseE164ToCountryAndNational(value);
      if (parsed) {
        setCountry(parsed.country);
        setNationalNumber(parsed.nationalNumber);
      }
      lastValueRef.current = value;
      return;
    }
    setCountry(defaultCountry);
    if (lastValueRef.current !== "") {
      setNationalNumber("");
    }
    lastValueRef.current = "";
  }, [value, defaultCountry]);

  const handleCountryChange = (c: CountryCode) => {
    setCountry(c);
    setCountryOpen(false);
    if (nationalNumber.trim()) {
      const result = parseAndValidatePhone(nationalNumber, c);
      if (result.valid) onChange(result.e164);
      else onChange(`+${getCountryCallingCode(c)}${nationalNumber}`);
    } else {
      onChange("");
    }
  };

  const handleNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setNationalNumber(digits);
    if (!digits) {
      onChange("");
      return;
    }
    const result = parseAndValidatePhone(digits, country);
    if (result.valid) {
      onChange(result.e164);
    } else {
      onChange(`+${getCountryCallingCode(country)}${digits}`);
    }
  };

  const showError = (() => {
    if (error) return error;
    if (nationalNumber.trim()) {
      const result = parseAndValidatePhone(nationalNumber, country);
      if (!result.valid) return result.error;
    }
    return null;
  })();

  return (
    <div
      className={cn("space-y-2 min-w-0", className)}
      id={id}
      data-slot="phone-input"
    >
      <div className="flex gap-2 min-w-0">
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              aria-label="Country"
              disabled={disabled}
              className={cn(
                "shrink-0 gap-1.5 min-w-[120px] justify-between px-3",
                showError && "border-destructive",
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FlagIcon country={country} />
                <span className="text-sm">
                  +{getCountryCallingCode(country)}
                </span>
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 opacity-50"
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countryOptions.map((c) => (
                    <CommandItem
                      key={c}
                      value={`${getCountryLabel(c)} ${c}`}
                      onSelect={() => handleCountryChange(c)}
                    >
                      <span className="flex items-center gap-2">
                        <FlagIcon country={c} />
                        <span className="truncate">{getCountryLabel(c)}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          id={numberInputId}
          type="tel"
          inputMode="numeric"
          value={nationalNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn("flex-1 min-w-0", showError && "border-destructive")}
          aria-invalid={!!showError}
          aria-describedby={
            showError ? `${numberInputId ?? "phone"}-error` : undefined
          }
        />
      </div>
      {showError && (
        <p
          id={numberInputId ? `${numberInputId}-error` : "phone-error"}
          className="text-sm text-destructive"
          role="alert"
        >
          {showError}
        </p>
      )}
    </div>
  );
}
