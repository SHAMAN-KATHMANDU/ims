/**
 * Loyalty Tier Service
 *
 * Automatically applies/removes loyalty tags
 * based on a contact's purchaseCount.
 */

import prisma from "@/config/prisma";
import { logger } from "@/config/logger";

export interface LoyaltyTier {
  tier: "none" | "customer" | "repeat_buyer" | "vip";
  label: string;
  tag: string | null;
}

const TIERS: Array<{ minCount: number } & LoyaltyTier> = [
  {
    minCount: 3,
    tier: "vip",
    label: "VIP",
    tag: "VIP",
  },
  {
    minCount: 2,
    tier: "repeat_buyer",
    label: "Repeat Buyer",
    tag: "Repeat Buyer",
  },
  {
    minCount: 1,
    tier: "customer",
    label: "Customer",
    tag: null,
  },
  {
    minCount: 0,
    tier: "none",
    label: "Prospect",
    tag: null,
  },
];

export function getLoyaltyTier(purchaseCount: number): LoyaltyTier {
  for (const t of TIERS) {
    if (purchaseCount >= t.minCount) {
      return {
        tier: t.tier,
        label: t.label,
        tag: t.tag,
      };
    }
  }
  return TIERS[TIERS.length - 1]!;
}

/**
 * Apply loyalty tier changes after purchaseCount is incremented.
 * Updates loyalty tags without overriding pipeline-linked journeyType.
 */
export async function applyLoyaltyTier(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      tenantId: true,
      purchaseCount: true,
    },
  });
  if (!contact) return;

  const tier = getLoyaltyTier(contact.purchaseCount);

  // Apply/remove loyalty tags
  const loyaltyTagNames = ["VIP", "Repeat Buyer"];
  for (const tagName of loyaltyTagNames) {
    const tag = await prisma.contactTag.findUnique({
      where: { tenantId_name: { tenantId: contact.tenantId, name: tagName } },
    });
    if (!tag) continue;

    const shouldHave = tier.tag === tagName;
    const existing = await prisma.contactTagLink.findUnique({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
    });

    if (shouldHave && !existing) {
      await prisma.contactTagLink.create({
        data: { contactId, tagId: tag.id },
      });
    } else if (!shouldHave && existing) {
      await prisma.contactTagLink.delete({
        where: { contactId_tagId: { contactId, tagId: tag.id } },
      });
    }
  }

  logger.info("Loyalty tier applied", undefined, {
    contactId,
    purchaseCount: contact.purchaseCount,
    tier: tier.tier,
  });

  return tier;
}
