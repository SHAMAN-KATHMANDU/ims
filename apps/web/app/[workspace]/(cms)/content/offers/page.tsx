import { OffersView } from "@/features/tenant-site/offers";

export const metadata = { title: "Offers — CMS" };

export default function OffersPage() {
  return (
    <div className="p-6 space-y-6">
      <OffersView />
    </div>
  );
}
