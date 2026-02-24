/**
 * Date range strategy - clamps dates for role-based restrictions (e.g. user role).
 */

export interface DateRangeResult {
  startDate: string;
  endDate: string;
}

export const dateRangeStrategy = {
  clampForRole(
    role: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined,
  ): DateRangeResult {
    if (role !== "user") {
      return {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
      };
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    if (!startDate && !endDate) {
      return {
        startDate: todayStart.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
      };
    }

    const reqStart = startDate ? new Date(startDate) : yesterdayStart;
    const reqEnd = endDate ? new Date(endDate) : today;

    let clampedStart = startDate ?? yesterdayStart.toISOString().slice(0, 10);
    let clampedEnd = endDate ?? today.toISOString().slice(0, 10);

    if (reqStart < yesterdayStart) {
      clampedStart = yesterdayStart.toISOString().slice(0, 10);
    }
    if (reqEnd > today) {
      clampedEnd = today.toISOString().slice(0, 10);
    }

    return { startDate: clampedStart, endDate: clampedEnd };
  },
};
