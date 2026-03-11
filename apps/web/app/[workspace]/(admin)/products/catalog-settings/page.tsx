"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, Layers } from "lucide-react";
import { CategoriesPage, AttributeTypesPage } from "@/features/products";

const CATEGORIES_TAB = "categories";
const ATTRIBUTE_TYPES_TAB = "attribute-types";

export default function CatalogSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === ATTRIBUTE_TYPES_TAB ? ATTRIBUTE_TYPES_TAB : CATEGORIES_TAB;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Catalog Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage product categories, subcategories, and attribute types.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger
            value={CATEGORIES_TAB}
            className="gap-2 shrink-0"
          >
            <Tags className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger
            value={ATTRIBUTE_TYPES_TAB}
            className="gap-2 shrink-0"
          >
            <Layers className="h-4 w-4" />
            Attribute Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value={CATEGORIES_TAB} className="mt-0">
          <CategoriesPage />
        </TabsContent>
        <TabsContent value={ATTRIBUTE_TYPES_TAB} className="mt-0">
          <AttributeTypesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
