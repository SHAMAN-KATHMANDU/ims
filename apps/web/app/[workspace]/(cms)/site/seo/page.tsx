import { SeoView } from "@/features/tenant-site/seo-cms";

export const metadata = { title: "SEO & Redirects — CMS" };

export default function SEOPage() {
  return (
    <div className="p-6 space-y-6">
      <SeoView />
    </div>
  );
}
