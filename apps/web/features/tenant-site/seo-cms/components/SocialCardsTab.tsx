"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import {
  usePagesQuery,
  useUpdatePage,
  type TenantPage,
} from "../../hooks/use-pages";
import { useUploadMedia } from "../../hooks/use-media";
import { useSiteConfig } from "../../hooks/use-tenant-site";

export function SocialCardsTab() {
  const { toast } = useToast();
  const { data: siteConfig } = useSiteConfig();
  const { data: pagesData } = usePagesQuery();
  const uploadMedia = useUploadMedia();
  const updatePage = useUpdatePage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const seoData = (siteConfig?.seo ?? {}) as Record<string, unknown>;
  const twitterHandle = (seoData.twitterHandle as string) ?? "";
  const pages = pagesData?.pages ?? [];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPageId) {
      toast({
        title: "Please select a page first",
        variant: "destructive",
      });
      return;
    }

    try {
      const mediaResult = await uploadMedia.mutateAsync({
        file,
        purpose: "library",
      });

      await updatePage.mutateAsync({
        id: selectedPageId,
        payload: {
          coverImageUrl: mediaResult.publicUrl,
        },
      });

      toast({ title: "Social card image updated" });
    } catch {
      toast({
        title: "Failed to upload image",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      <Card className="p-6 space-y-4">
        <Label className="text-sm font-semibold">Page social cards</Label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pages yet</p>
          ) : (
            pages.map((page: TenantPage) => (
              <button
                key={page.id}
                type="button"
                className={`p-3 rounded border cursor-pointer transition-colors text-left ${
                  selectedPageId === page.id
                    ? "bg-accent text-accent-foreground border-accent"
                    : "hover:bg-muted/30"
                }`}
                onClick={() => setSelectedPageId(page.id)}
              >
                <div className="text-sm font-medium">{page.title}</div>
                {page.coverImageUrl && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Image set
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {selectedPageId && (
        <Card className="p-6 space-y-4">
          <Label className="text-sm font-semibold">Selected page preview</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Open Graph preview
              </div>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {pages.find((p: TenantPage) => p.id === selectedPageId)
                  ?.coverImageUrl ? (
                  <Image
                    src={
                      pages.find((p: TenantPage) => p.id === selectedPageId)
                        ?.coverImageUrl ?? ""
                    }
                    alt="OG preview"
                    width={400}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs">No image set</div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleUploadClick}
                disabled={uploadMedia.isPending || updatePage.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload image
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: 1200×630 pixels
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Twitter card preview
              </div>
              <Card className="p-3 bg-muted/30 space-y-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  twitter.com
                </div>
                <div className="text-sm font-medium line-clamp-2">
                  {
                    pages.find((p: TenantPage) => p.id === selectedPageId)
                      ?.title
                  }
                </div>
                {twitterHandle && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {twitterHandle}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
