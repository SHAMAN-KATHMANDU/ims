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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

export interface PhoneInputProps {
  /** Current value as E.164 (e.g. +9779841234567). Empty string when no phone. */
  value: string;
  /** Called with E.164 when valid, or "" when empty/invalid. */
  onChange: (e164: string) => void;
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
  const lastValueRef = useRef<string>(value);

  const countryOptions = useMemo(() => {
    const list = getCountries();
    return [...list].sort((a, b) =>
      getCountryLabel(a).localeCompare(getCountryLabel(b)),
    );
  }, []);

  // Sync from parent value (e.g. edit mode or form reset). When value is ""
  // only clear if the parent explicitly reset (value went from non-empty to ""),
  // so we don't wipe the user's digits while they're typing an invalid number.
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

  const handleCountryChange = (v: string) => {
    const c = v as CountryCode;
    setCountry(c);
    if (nationalNumber.trim()) {
      const result = parseAndValidatePhone(nationalNumber, c);
      if (result.valid) onChange(result.e164);
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
    if (result.valid) onChange(result.e164);
    // When invalid, do not call onChange - parent keeps previous value and we keep showing digits
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
    <div className={cn("space-y-2 min-w-0", className)} id={id}>
      <div className="flex gap-2 min-w-0">
        <Select
          value={country}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "w-[100px] shrink-0 text-sm",
              showError && "border-destructive",
            )}
            aria-label="Country"
          >
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {getCountryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={numberInputId}
          type="tel"
          inputMode="numeric"
          value={nationalNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
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
        >
          {showError}
        </p>
      )}
    </div>
  );
}
