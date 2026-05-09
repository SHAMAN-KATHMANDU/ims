"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RedirectsTab } from "./RedirectsTab";
import { MetaDefaultsTab } from "./MetaDefaultsTab";
import { SitemapTab } from "./SitemapTab";
import { SocialCardsTab } from "./SocialCardsTab";

export function SeoView() {
  const [activeTab, setActiveTab] = useState("redirects");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SEO & redirects"
        description="Meta defaults, sitemap, robots, and URL redirects."
      />

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="border-b rounded-none bg-transparent p-4 w-full justify-start h-auto">
            <TabsTrigger
              value="redirects"
              className="rounded-none border-b-2 border-transparent pb-3 data-[state=active]:border-b-foreground"
            >
              Redirects
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className="rounded-none border-b-2 border-transparent pb-3 data-[state=active]:border-b-foreground"
            >
              Meta defaults
            </TabsTrigger>
            <TabsTrigger
              value="sitemap"
              className="rounded-none border-b-2 border-transparent pb-3 data-[state=active]:border-b-foreground"
            >
              Sitemap & robots
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="rounded-none border-b-2 border-transparent pb-3 data-[state=active]:border-b-foreground"
            >
              Social cards
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="redirects" className="mt-0">
              <RedirectsTab />
            </TabsContent>
            <TabsContent value="meta" className="mt-0">
              <MetaDefaultsTab />
            </TabsContent>
            <TabsContent value="sitemap" className="mt-0">
              <SitemapTab />
            </TabsContent>
            <TabsContent value="social" className="mt-0">
              <SocialCardsTab />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
