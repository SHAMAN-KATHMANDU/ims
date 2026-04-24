import { PermissionGate } from "@/features/permissions";
import { ReviewsPage } from "@/features/reviews";

export const metadata = { title: "Reviews" };

export default function Reviews() {
  return (
    <PermissionGate perm="WEBSITE.REVIEWS.VIEW">
      <ReviewsPage />
    </PermissionGate>
  );
}
