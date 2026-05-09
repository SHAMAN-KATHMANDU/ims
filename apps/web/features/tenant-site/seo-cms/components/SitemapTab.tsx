"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lumenandcoal.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lumenandcoal.com/menus/dinner</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://lumenandcoal.com/journal</loc>
    <priority>0.8</priority>
  </url>
  … 18 more URLs …
</urlset>`;

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /preview

Sitemap: https://lumenandcoal.com/sitemap.xml`;

export function SitemapTab() {
  const { toast } = useToast();

  const handleRegenerate = () => {
    // TODO: implement sitemap regeneration endpoint
    toast({
      title: "Sitemap regeneration not yet available",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm font-semibold">sitemap.xml</div>
          <Button size="sm" onClick={handleRegenerate}>
            Regenerate sitemap
          </Button>
        </div>
        <Card className="p-3 bg-muted/30 border-0">
          <code className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto block">
            {SITEMAP_XML}
          </code>
        </Card>
        <p className="text-xs text-muted-foreground">
          Last generated 2 hours ago
        </p>
      </div>

      <div className="border-t pt-6 space-y-3">
        <div className="text-sm font-semibold">robots.txt</div>
        <Card className="p-3 bg-muted/30 border-0">
          <code className="text-xs text-muted-foreground font-mono whitespace-pre-wrap block">
            {ROBOTS_TXT}
          </code>
        </Card>
      </div>

      <div className="border-t pt-6 space-y-3">
        <div className="text-sm font-semibold">Search engine configuration</div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm">
              Allow search engines to index this site
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm">
              Submit sitemap to Google Search Console
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm">
              Generate AI-readable summaries (llms.txt)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
