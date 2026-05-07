import { PageHeader } from "@/components/layout/page-header";
import { FooterPanel } from "@/features/tenant-site/components/FooterPanel";

export default function FooterPage() {
  return (
    <>
      <PageHeader title="Footer" description="Customize your site footer" />
      <div className="space-y-6">
        <FooterPanel />
      </div>
    </>
  );
}
