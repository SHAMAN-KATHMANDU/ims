import { FormsView } from "@/features/tenant-site/forms-cms";

export const metadata = { title: "Forms — CMS" };

export default function FormsPage() {
  return (
    <div className="p-6 space-y-6">
      <FormsView />
    </div>
  );
}
