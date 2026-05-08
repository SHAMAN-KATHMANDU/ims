import type { PrismaClient } from "@prisma/client";

/**
 * Delete a tenant and all its data by slug.
 * Order respects FK constraints (children before parents).
 */
export async function deleteTenantBySlug(
  prisma: PrismaClient,
  slug: string,
): Promise<void> {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return;
  const tid = existing.id;

  await prisma.transferLog.deleteMany({
    where: { transfer: { tenantId: tid } },
  });
  await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
  await prisma.errorReport.deleteMany({ where: { tenantId: tid } });
  await prisma.salePayment.deleteMany({
    where: { sale: { tenantId: tid } },
  });
  await prisma.saleItem.deleteMany({
    where: { sale: { tenantId: tid } },
  });
  await prisma.sale.deleteMany({ where: { tenantId: tid } });
  await prisma.transferItem.deleteMany({
    where: { transfer: { tenantId: tid } },
  });
  await prisma.transfer.deleteMany({ where: { tenantId: tid } });

  const locIds = await prisma.location
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((l) => l.id));
  if (locIds.length) {
    await prisma.locationInventory.deleteMany({
      where: { locationId: { in: locIds } },
    });
  }

  const productIds = await prisma.product
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((p) => p.id));
  const variationIds =
    productIds.length > 0
      ? await prisma.productVariation
          .findMany({
            where: { productId: { in: productIds } },
            select: { id: true },
          })
          .then((r) => r.map((v) => v.id))
      : [];
  if (variationIds.length > 0) {
    // InventorySignal.variation_id references product_variations with onDelete: Restrict (Phase 9 FK drift fix)
    await prisma.inventorySignal.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.variationPhoto.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.locationInventory.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.productSubVariation.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.productVariationAttribute.deleteMany({
      where: { variationId: { in: variationIds } },
    });
    await prisma.productVariation.deleteMany({
      where: { id: { in: variationIds } },
    });
  }
  if (productIds.length > 0) {
    await prisma.productDiscount.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.promoCodeProduct.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productAttributeType.deleteMany({
      where: { productId: { in: productIds } },
    });
  }
  await prisma.dealLineItem.deleteMany({
    where: { deal: { tenantId: tid } },
  });
  await prisma.product.deleteMany({ where: { tenantId: tid } });

  const categoryIds = await prisma.category
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((c) => c.id));
  if (categoryIds.length > 0) {
    await prisma.subCategory.deleteMany({
      where: { categoryId: { in: categoryIds } },
    });
  }
  await prisma.category.deleteMany({ where: { tenantId: tid } });
  await prisma.discountType.deleteMany({ where: { tenantId: tid } });
  await prisma.vendor.deleteMany({ where: { tenantId: tid } });
  await prisma.location.deleteMany({ where: { tenantId: tid } });

  const userIds = await prisma.user
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((u) => u.id));
  if (userIds.length > 0) {
    // TransferLog.user is onDelete: Restrict — remove any log rows still pointing at
    // tenant users (e.g. edge cases missed by the transfer-scoped delete above).
    await prisma.transferLog.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
  }
  await prisma.activity.deleteMany({ where: { tenantId: tid } });
  await prisma.task.deleteMany({ where: { tenantId: tid } });
  await prisma.deal.deleteMany({ where: { tenantId: tid } });
  await prisma.lead.deleteMany({ where: { tenantId: tid } });

  const contactIds = await prisma.contact
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((c) => c.id));
  if (contactIds.length > 0) {
    await prisma.contactNote.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactAttachment.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactCommunication.deleteMany({
      where: { contactId: { in: contactIds } },
    });
    await prisma.contactTagLink.deleteMany({
      where: { contactId: { in: contactIds } },
    });
  }
  await prisma.contact.deleteMany({ where: { tenantId: tid } });
  await prisma.company.deleteMany({ where: { tenantId: tid } });
  await prisma.contactTag.deleteMany({ where: { tenantId: tid } });
  await prisma.pipeline.deleteMany({ where: { tenantId: tid } });
  await prisma.crmSource.deleteMany({ where: { tenantId: tid } });
  await prisma.crmJourneyType.deleteMany({ where: { tenantId: tid } });

  const attrTypeIds = await prisma.attributeType
    .findMany({ where: { tenantId: tid }, select: { id: true } })
    .then((r) => r.map((a) => a.id));
  if (attrTypeIds.length > 0) {
    await prisma.attributeValue.deleteMany({
      where: { attributeTypeId: { in: attrTypeIds } },
    });
    await prisma.attributeType.deleteMany({ where: { tenantId: tid } });
  }

  await prisma.member.deleteMany({ where: { tenantId: tid } });
  await prisma.promoCode.deleteMany({ where: { tenantId: tid } });
  await prisma.tenantPayment.deleteMany({ where: { tenantId: tid } });
  await prisma.subscription.deleteMany({ where: { tenantId: tid } });
  await prisma.passwordResetRequest.deleteMany({ where: { tenantId: tid } });

  // Phase 9 seed cleanup drift fix: Handle remaining RESTRICT FKs before deleting users.
  // These tables have tenantId and user FKs that must be cleared in order.
  await prisma.automationDefinition.deleteMany({ where: { tenantId: tid } });
  await prisma.blockComment.deleteMany({ where: { tenantId: tid } });
  await prisma.mediaAsset.deleteMany({ where: { tenantId: tid } });

  await prisma.user.deleteMany({ where: { tenantId: tid } });
  await prisma.tenant.delete({ where: { id: tid } });
}
