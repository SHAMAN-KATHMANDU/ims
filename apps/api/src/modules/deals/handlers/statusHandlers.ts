/**
 * Deal status branching - normalize status and apply side effects (e.g. closedAt).
 */

export const DealStatus = {
  OPEN: "OPEN",
  WON: "WON",
  LOST: "LOST",
} as const;

export type DealStatusType = (typeof DealStatus)[keyof typeof DealStatus];

const CLOSED_STATUSES: DealStatusType[] = [DealStatus.WON, DealStatus.LOST];

/**
 * Normalizes input to a valid deal status. Unknown or invalid values become OPEN.
 */
export function normalizeDealStatus(input: unknown): DealStatusType {
  if (input === DealStatus.WON || input === DealStatus.LOST) {
    return input;
  }
  return DealStatus.OPEN;
}

/**
 * Returns true when the deal is in a closed state (WON or LOST).
 */
export function isClosedStatus(status: DealStatusType): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Applies status-related side effects to update data (e.g. set closedAt when status is WON/LOST).
 */
export function applyStatusSideEffects(
  status: DealStatusType,
  updateData: { closedAt?: Date | null },
): void {
  if (isClosedStatus(status)) {
    updateData.closedAt = new Date();
  }
}
