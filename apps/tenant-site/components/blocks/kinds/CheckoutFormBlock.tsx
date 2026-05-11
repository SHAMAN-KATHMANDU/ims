import type { CheckoutFormProps } from "@repo/shared";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import type { BlockComponentProps } from "../registry";

/**
 * checkout-form — guest checkout entry point on the cart scope.
 *
 * The existing `CheckoutForm` component (apps/tenant-site/components/cart/
 * CheckoutForm.tsx) is the source of truth: it owns name/phone/email/note
 * fields, posts to `/public/orders` via `postGuestOrder`, and renders the
 * confirmation screen. This block adapter just hands it the right
 * tenant context — the `submitButtonLabel` / `showOrderSummary` props
 * are intentionally not surfaced yet because the underlying form has its
 * own copy and order-summary integration; wiring them through is a
 * follow-up after the core component is moved into the block UX.
 */
export function CheckoutFormBlock({
  dataContext,
}: BlockComponentProps<CheckoutFormProps>) {
  return (
    <CheckoutForm host={dataContext.host} tenantId={dataContext.tenantId} />
  );
}
