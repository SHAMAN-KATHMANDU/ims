import { DateTime } from "luxon";

export function parseDate(dateString: string): DateTime | null {
  if (!dateString || dateString.trim() === "") {
    return null;
  }
  return DateTime.fromISO(dateString);
}
