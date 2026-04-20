import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));
vi.mock("@/config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("./remarketing.service", () => ({
  default: { processPendingSequences: vi.fn() },
}));

import cron from "node-cron";
import { logger } from "@/config/logger";
import remarketingService from "./remarketing.service";
import {
  startRemarketingScheduler,
  stopRemarketingScheduler,
} from "./remarketing.scheduler";

const mockSchedule = cron.schedule as unknown as ReturnType<typeof vi.fn>;
const mockInfo = logger.info as unknown as ReturnType<typeof vi.fn>;
const mockError = logger.error as unknown as ReturnType<typeof vi.fn>;
const mockProcess =
  remarketingService.processPendingSequences as unknown as ReturnType<
    typeof vi.fn
  >;

function captureCronHandler(): () => Promise<void> {
  const call = mockSchedule.mock.calls.at(-1);
  if (!call) throw new Error("cron.schedule was never called");
  return call[1] as () => Promise<void>;
}

describe("remarketing.scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level scheduledTask by stopping any prior run
    stopRemarketingScheduler();
    vi.clearAllMocks();
  });

  describe("startRemarketingScheduler", () => {
    it("schedules the hourly cron on first call", () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 * * * *",
        expect.any(Function),
      );
    });

    it("does not schedule twice if already running", () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      startRemarketingScheduler();
      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockInfo).toHaveBeenCalledWith(
        "Remarketing scheduler already running",
      );
    });
  });

  describe("cron tick handler", () => {
    it("logs batch info only when total > 0", async () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      const tick = captureCronHandler();

      mockProcess.mockResolvedValue({ executed: 3, paused: 1, total: 4 });
      await tick();

      expect(mockProcess).toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        "Remarketing scheduler: batch complete",
        undefined,
        { executed: 3, paused: 1, total: 4 },
      );
    });

    it("skips batch-complete log when total === 0", async () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      const tick = captureCronHandler();

      mockProcess.mockResolvedValue({ executed: 0, paused: 0, total: 0 });
      await tick();

      // "processing pending sequences" log still fires, but not "batch complete"
      const batchCompleteCalls = mockInfo.mock.calls.filter(
        (c) => c[0] === "Remarketing scheduler: batch complete",
      );
      expect(batchCompleteCalls).toHaveLength(0);
    });

    it("logs error and does not throw when processPendingSequences rejects", async () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      const tick = captureCronHandler();

      mockProcess.mockRejectedValue(new Error("DB down"));
      await expect(tick()).resolves.toBeUndefined();
      expect(mockError).toHaveBeenCalledWith(
        "Remarketing scheduler: failed",
        undefined,
        { error: "DB down" },
      );
    });

    it("stringifies non-Error rejections in the error log", async () => {
      mockSchedule.mockReturnValue({ stop: vi.fn() });
      startRemarketingScheduler();
      const tick = captureCronHandler();

      mockProcess.mockRejectedValue("plain string failure");
      await tick();

      expect(mockError).toHaveBeenCalledWith(
        "Remarketing scheduler: failed",
        undefined,
        { error: "plain string failure" },
      );
    });
  });

  describe("stopRemarketingScheduler", () => {
    it("calls stop on the scheduled task and logs", () => {
      const stop = vi.fn();
      mockSchedule.mockReturnValue({ stop });
      startRemarketingScheduler();

      stopRemarketingScheduler();
      expect(stop).toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith("Remarketing scheduler stopped");
    });

    it("is a no-op when no task is running", () => {
      // fresh state — stop before start
      expect(() => stopRemarketingScheduler()).not.toThrow();
    });

    it("allows re-starting after stop", () => {
      const stopA = vi.fn();
      const stopB = vi.fn();
      mockSchedule
        .mockReturnValueOnce({ stop: stopA })
        .mockReturnValueOnce({ stop: stopB });

      startRemarketingScheduler();
      stopRemarketingScheduler();
      startRemarketingScheduler();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
    });
  });
});
