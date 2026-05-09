import { SettingsView } from "@/features/tenant-site/site-settings";

export const metadata = { title: "Settings — CMS" };

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <SettingsView />
    </div>
  );
}
