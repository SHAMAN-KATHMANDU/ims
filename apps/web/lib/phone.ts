import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

/** Default country when the input has no country code (e.g. 9801234567). Use for parsing local numbers. */
const DEFAULT_COUNTRY: CountryCode = "NP";

export { getCountries, getCountryCallingCode };
export type { CountryCode };

export type PhoneParseResult =
  | { valid: true; e164: string; error?: undefined }
  | { valid: false; e164?: undefined; error: string };

/**
 * Parse and validate a phone number using libphonenumber-js.
 * Returns E.164 format on success for consistent storage and API submission.
 */
export function parseAndValidatePhone(
  value: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): PhoneParseResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number is required" };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed) {
      return { valid: false, error: "Invalid phone number" };
    }
    if (!isValidPhoneNumber(trimmed, defaultCountry)) {
      return { valid: false, error: "Invalid phone number" };
    }
    return { valid: true, e164: parsed.format("E.164") };
  } catch {
    return { valid: false, error: "Invalid phone number" };
  }
}

/**
 * Zod-friendly: refine a string to be a valid phone (optional field).
 * Use with z.string().optional().refine(...)
 */
export function isValidPhoneOptional(
  val: string | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  if (val === undefined || val === null || val.trim() === "") return true;
  return parseAndValidatePhone(val, defaultCountry).valid;
}

/**
 * Zod-friendly: refine a string to be a valid phone (required field).
 */
export function isValidPhoneRequired(
  val: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  if (!val?.trim()) return false;
  return parseAndValidatePhone(val, defaultCountry).valid;
}

/**
 * Parse an E.164 phone number into country code and national number.
 * Use when pre-filling the country dropdown + number field (e.g. edit forms).
 */
export function parseE164ToCountryAndNational(
  e164: string,
): { country: CountryCode; nationalNumber: string } | null {
  if (!e164?.trim()) return null;
  const trimmed = e164.trim();
  try {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (!parsed?.country) return null;
    return {
      country: parsed.country as CountryCode,
      nationalNumber: parsed.nationalNumber,
    };
  } catch {
    return null;
  }
}
