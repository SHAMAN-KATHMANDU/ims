import { logger } from "@/config/logger";
import remarketingRepository from "./remarketing.repository";

const SEQUENCE_DAYS_POST_PURCHASE = [3, 7, 14, 21];
const SEQUENCE_DAYS_DORMANT = [7, 14, 30, 90];
const SEQUENCE_DAYS_DORMANT_FROM_REPURCHASE = [14, 30, 90];

const SEQUENCE_MESSAGES: Record<number, string> = {
  3: "Satisfaction check — how was your experience?",
  7: "We'd love your feedback! Leave a review.",
  14: "Check out these complementary products.",
  21: "We miss you! Here's what's new.",
  30: "It's been a month — any interest in our latest collection?",
  90: "Quarterly check-in — exclusive offer inside.",
};

export class RemarketingService {
  /**
   * Create the full sequence of entries when a remarketing deal is created.
   * @param fromStage - "Post-Purchase Follow-up" or "Dormant"
   * @param fromRepurchaseLost - if true, start Dormant sequence at Day 14
   */
  async createSequenceForDeal(
    tenantId: string,
    contactId: string,
    dealId: string,
    fromStage: string,
    fromRepurchaseLost = false,
  ) {
    let days: number[];
    if (fromStage === "Post-Purchase Follow-up") {
      days = SEQUENCE_DAYS_POST_PURCHASE;
    } else if (fromRepurchaseLost) {
      days = SEQUENCE_DAYS_DORMANT_FROM_REPURCHASE;
    } else {
      days = SEQUENCE_DAYS_DORMANT;
    }

    const now = new Date();
    const entries = days.map((day) => ({
      tenantId,
      contactId,
      dealId,
      sequenceDay: day,
      message: SEQUENCE_MESSAGES[day] ?? `Day ${day} follow-up`,
      scheduledAt: new Date(now.getTime() + day * 24 * 60 * 60 * 1000),
    }));

    await remarketingRepository.createManySequences(entries);
    return entries.length;
  }

  /**
   * Process all pending sequences that are due.
   * Called by the cron scheduler every hour.
   */
  async processPendingSequences() {
    const pending = await remarketingRepository.findPendingDue(50);
    let executed = 0;
    let paused = 0;

    for (const seq of pending) {
      try {
        const hasRepurchase = await remarketingRepository.hasOpenRepurchaseDeal(
          seq.contactId,
        );
        if (hasRepurchase) {
          await remarketingRepository.updateStatus(seq.id, "PAUSED");
          paused++;
          continue;
        }

        // Create a task for the assigned user to follow up
        if (seq.deal?.assignedToId) {
          const prisma = (await import("@/config/prisma")).default;
          await prisma.task.create({
            data: {
              tenantId: seq.tenantId,
              title: `Remarketing Day ${seq.sequenceDay}: ${seq.message ?? "Follow up"}`,
              contactId: seq.contactId,
              dealId: seq.dealId,
              assignedToId: seq.deal.assignedToId,
              dueDate: new Date(),
            },
          });

          await prisma.activity.create({
            data: {
              tenantId: seq.tenantId,
              type: "EMAIL",
              subject: `Remarketing Day ${seq.sequenceDay}`,
              notes: seq.message,
              activityAt: new Date(),
              contactId: seq.contactId,
              dealId: seq.dealId,
              createdById: seq.deal.assignedToId,
            },
          });
        }

        await remarketingRepository.markExecuted(seq.id);
        executed++;
      } catch (err) {
        logger.error("Failed to process remarketing sequence", undefined, {
          sequenceId: seq.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { executed, paused, total: pending.length };
  }

  async getSequencesByDeal(dealId: string) {
    return remarketingRepository.findByDeal(dealId);
  }

  async getSequencesByContact(contactId: string) {
    return remarketingRepository.findByContact(contactId);
  }

  async pauseByContact(contactId: string) {
    return remarketingRepository.pauseByContact(contactId);
  }

  async resumeByContact(contactId: string) {
    return remarketingRepository.resumeByContact(contactId);
  }
}

export default new RemarketingService();
