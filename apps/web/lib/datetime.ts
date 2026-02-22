export function dateInputToUtcMidnightIso(
  value?: string | null,
): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

export function datetimeLocalInputToIso(
  value?: string | null,
): string | undefined {
  if (!value) return undefined;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return undefined;
  return parsedDate.toISOString();
}
