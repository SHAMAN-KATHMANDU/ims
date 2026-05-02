"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { Tags, Layers, Hash } from "lucide-react";
import {
  CategoriesPage,
  AttributeTypesPage,
  ProductTagsPage,
} from "@/features/products";
import { PermissionGate } from "@/features/permissions";

const CATEGORIES_TAB = "categories";
const ATTRIBUTE_TYPES_TAB = "attribute-types";
const TAGS_TAB = "tags";

const VALID_TABS = new Set([CATEGORIES_TAB, ATTRIBUTE_TYPES_TAB, TAGS_TAB]);

export default function CatalogSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam && VALID_TABS.has(tabParam) ? tabParam : CATEGORIES_TAB;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog Settings"
        description="Manage product categories, subcategories, attribute types, and tags."
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value={CATEGORIES_TAB} className="gap-2 shrink-0">
            <Tags className="h-4 w-4" aria-hidden="true" />
            Categories
          </TabsTrigger>
          <TabsTrigger value={ATTRIBUTE_TYPES_TAB} className="gap-2 shrink-0">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Attribute Types
          </TabsTrigger>
          <TabsTrigger value={TAGS_TAB} className="gap-2 shrink-0">
            <Hash className="h-4 w-4" aria-hidden="true" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value={CATEGORIES_TAB} className="mt-0">
          <PermissionGate perm="INVENTORY.CATEGORIES.VIEW">
            <CategoriesPage />
          </PermissionGate>
        </TabsContent>
        <TabsContent value={ATTRIBUTE_TYPES_TAB} className="mt-0">
          <PermissionGate perm="INVENTORY.ATTRIBUTE_TYPES.VIEW">
            <AttributeTypesPage />
          </PermissionGate>
        </TabsContent>
        <TabsContent value={TAGS_TAB} className="mt-0">
          <PermissionGate perm="INVENTORY.CATEGORIES.VIEW">
            <ProductTagsPage />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
