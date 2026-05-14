import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

/** Default country when the input has no country code. */
const DEFAULT_COUNTRY: CountryCode = "NP";

export type PhoneParseResult =
  | { valid: true; e164: string }
  | { valid: false; e164?: undefined; message: string };

/**
 * Parse and validate a phone number. Returns E.164 format on success.
 */
/**
 * Lenient parse for member **lookup** by phone (e.g. New Sale debounced check).
 * Nepal mobiles: accept `isPossible()` so valid carrier ranges that fail strict
 * `isValidPhoneNumber` still resolve. Other countries stay strict.
 */
export function parsePhoneForMemberLookup(
  value: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): PhoneParseResult {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: "Phone number is required" };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed) {
      return { valid: false, message: "Invalid phone number" };
    }
    if (parsed.country === "NP" && parsed.isPossible()) {
      return { valid: true, e164: parsed.format("E.164") };
    }
    if (!isValidPhoneNumber(trimmed, defaultCountry)) {
      return { valid: false, message: "Invalid phone number" };
    }
    return { valid: true, e164: parsed.format("E.164") };
  } catch {
    return { valid: false, message: "Invalid phone number" };
  }
}

export function parseAndValidatePhone(
  value: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): PhoneParseResult {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: "Phone number is required" };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed) {
      return { valid: false, message: "Invalid phone number" };
    }
    if (!isValidPhoneNumber(trimmed, defaultCountry)) {
      return { valid: false, message: "Invalid phone number" };
    }
    return { valid: true, e164: parsed.format("E.164") };
  } catch {
    return { valid: false, message: "Invalid phone number" };
  }
}

/**
 * Normalize phone to E.164 or throw. Use when phone is required (e.g. members).
 */
export function normalizePhoneRequired(
  value: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string {
  const result = parseAndValidatePhone(value, defaultCountry);
  if (result.valid) return result.e164;
  const err = result as { valid: false; message: string };
  throw new Error(err.message);
}

/**
 * Normalize phone to E.164 when provided; return null for empty. Use for optional phone fields.
 */
export function normalizePhoneOptional(
  value: string | undefined | null,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const result = parseAndValidatePhone(trimmed, defaultCountry);
  if (result.valid) return result.e164;
  const err = result as { valid: false; message: string };
  throw new Error(err.message);
}
