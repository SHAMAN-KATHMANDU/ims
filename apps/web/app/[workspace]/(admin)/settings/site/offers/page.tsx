"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LayoutTemplate, Tag, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SiteOffersSettingsPage() {
  const params = useParams() as { workspace?: string };
  const workspace = params.workspace ?? "";

  const designHref = `/${workspace}/settings/site/design?scope=offers`;
  const discountsHref = `/${workspace}/products/discounts`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Offers page</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control what visitors see on your{" "}
          <span className="font-mono text-xs">/offers</span> page. Customise the
          layout in the visual editor, and manage which products appear by
          creating product discounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Page layout</CardTitle>
            </div>
            <CardDescription>
              Use the block editor to customise the heading, grid layout,
              banners, and any other content shown on the offers page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={designHref}>
                Edit layout <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Product discounts</CardTitle>
            </div>
            <CardDescription>
              Products with an active discount automatically appear on the
              offers page. Create, schedule, and manage discount campaigns here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={discountsHref}>
                Manage discounts <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
