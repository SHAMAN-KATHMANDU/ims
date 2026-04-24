import { GiftCardsPage } from "@/features/gift-cards";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Gift cards" };

export default function GiftCards() {
  return (
    <PermissionGate perm="INVENTORY.GIFT_CARDS.VIEW">
      <GiftCardsPage />
    </PermissionGate>
  );
}
