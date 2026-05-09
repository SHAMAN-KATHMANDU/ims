"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import {
  usePagesQuery,
  useUpdatePage,
  type TenantPage,
} from "../../hooks/use-pages";
import { useUploadMedia } from "../../hooks/use-media";
import {
  useSiteConfig,
  useUpdateSiteConfig,
} from "../../hooks/use-tenant-site";

type NetworkType =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "whatsapp"
  | "pinterest";

interface SocialNetworkConfig {
  twitter?: {
    handle?: string;
    enabled?: boolean;
    cardType?: "summary" | "summary_large_image";
  };
  facebook?: { pageUrl?: string; enabled?: boolean };
  linkedin?: { pageUrl?: string; enabled?: boolean };
  whatsapp?: { enabled?: boolean };
  pinterest?: { handle?: string; enabled?: boolean };
}

export function SocialCardsTab() {
  const { toast } = useToast();
  const { data: siteConfig } = useSiteConfig();
  const { data: pagesData } = usePagesQuery();
  const uploadMedia = useUploadMedia();
  const updatePage = useUpdatePage();
  const updateSiteConfig = useUpdateSiteConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<NetworkType>("twitter");

  const seoData = (siteConfig?.seo ?? {}) as Record<string, unknown>;
  const socialConfig = (seoData.social ?? {}) as SocialNetworkConfig;
  const pages = pagesData?.pages ?? [];
  const selectedPage = pages.find((p: TenantPage) => p.id === selectedPageId);

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

  const handleNetworkToggle = async (
    network: NetworkType,
    enabled: boolean,
  ) => {
    const nextSocial = { ...socialConfig };
    if (!nextSocial[network]) {
      nextSocial[network] = {};
    }
    nextSocial[network]!.enabled = enabled;

    try {
      await updateSiteConfig.mutateAsync({
        seo: { ...seoData, social: nextSocial },
      });
      toast({ title: `${network} ${enabled ? "enabled" : "disabled"}` });
    } catch {
      toast({
        title: "Failed to update network settings",
        variant: "destructive",
      });
    }
  };

  const handleNetworkUpdate = async (
    network: NetworkType,
    field: string,
    value: string,
  ) => {
    const nextSocial = { ...socialConfig };
    if (!nextSocial[network]) {
      nextSocial[network] = {};
    }
    (nextSocial[network] as Record<string, unknown>)[field] = value;

    try {
      await updateSiteConfig.mutateAsync({
        seo: { ...seoData, social: nextSocial },
      });
    } catch {
      toast({
        title: "Failed to update network settings",
        variant: "destructive",
      });
    }
  };

  const renderTwitterPreview = () => {
    const config = socialConfig.twitter;
    return (
      <Card className="p-3 bg-muted/30 space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          twitter.com
        </div>
        <div className="text-sm font-medium line-clamp-2">
          {selectedPage?.title}
        </div>
        {config?.handle && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            @{config.handle}
          </div>
        )}
      </Card>
    );
  };

  const renderFacebookPreview = () => {
    const config = socialConfig.facebook;
    return (
      <Card className="p-3 bg-muted/30 space-y-2">
        <div className="text-xs text-blue-600 font-semibold">facebook.com</div>
        <div className="text-sm font-medium line-clamp-2">
          {selectedPage?.title}
        </div>
        {config?.pageUrl && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {config.pageUrl}
          </div>
        )}
      </Card>
    );
  };

  const renderLinkedInPreview = () => {
    const config = socialConfig.linkedin;
    return (
      <Card className="p-3 bg-muted/30 space-y-2">
        <div className="text-xs text-blue-700 font-semibold">linkedin.com</div>
        <div className="text-sm font-medium line-clamp-2">
          {selectedPage?.title}
        </div>
        {config?.pageUrl && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {config.pageUrl}
          </div>
        )}
      </Card>
    );
  };

  const renderWhatsAppPreview = () => {
    return (
      <Card className="p-3 bg-green-50 dark:bg-green-950 space-y-2">
        <div className="text-xs text-green-700 dark:text-green-300 font-semibold">
          WhatsApp
        </div>
        <div className="text-sm font-medium line-clamp-2">
          {selectedPage?.title}
        </div>
      </Card>
    );
  };

  const renderPinterestPreview = () => {
    const config = socialConfig.pinterest;
    return (
      <Card className="p-3 bg-red-50 dark:bg-red-950 space-y-2">
        <div className="text-xs text-red-700 dark:text-red-300 font-semibold">
          pinterest.com
        </div>
        <div className="text-sm font-medium line-clamp-2">
          {selectedPage?.title}
        </div>
        {config?.handle && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {config.handle}
          </div>
        )}
      </Card>
    );
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

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Cover image (Open Graph)
              </div>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {selectedPage?.coverImageUrl ? (
                  <Image
                    src={selectedPage.coverImageUrl}
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

            <Tabs
              value={activeNetwork}
              onValueChange={(v) => setActiveNetwork(v as NetworkType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="twitter">Twitter</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="pinterest">Pinterest</TabsTrigger>
              </TabsList>

              <TabsContent value="twitter" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Twitter card</Label>
                    <Switch
                      checked={socialConfig.twitter?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleNetworkToggle("twitter", checked)
                      }
                    />
                  </div>
                  {socialConfig.twitter?.enabled && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="twitter-handle" className="text-xs">
                          Twitter handle (without @)
                        </Label>
                        <Input
                          id="twitter-handle"
                          placeholder="yourhandle"
                          value={socialConfig.twitter?.handle ?? ""}
                          onChange={(e) =>
                            handleNetworkUpdate(
                              "twitter",
                              "handle",
                              e.target.value,
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="twitter-card" className="text-xs">
                          Card type
                        </Label>
                        <select
                          id="twitter-card"
                          value={
                            socialConfig.twitter?.cardType ??
                            "summary_large_image"
                          }
                          onChange={(e) =>
                            handleNetworkUpdate(
                              "twitter",
                              "cardType",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        >
                          <option value="summary">Summary</option>
                          <option value="summary_large_image">
                            Summary with large image
                          </option>
                        </select>
                      </div>
                    </>
                  )}
                  <div>{renderTwitterPreview()}</div>
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Facebook & OG tags</Label>
                    <Switch
                      checked={socialConfig.facebook?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleNetworkToggle("facebook", checked)
                      }
                    />
                  </div>
                  {socialConfig.facebook?.enabled && (
                    <div className="space-y-1">
                      <Label htmlFor="facebook-url" className="text-xs">
                        Facebook page URL
                      </Label>
                      <Input
                        id="facebook-url"
                        placeholder="https://facebook.com/yourpage"
                        value={socialConfig.facebook?.pageUrl ?? ""}
                        onChange={(e) =>
                          handleNetworkUpdate(
                            "facebook",
                            "pageUrl",
                            e.target.value,
                          )
                        }
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div>{renderFacebookPreview()}</div>
                </div>
              </TabsContent>

              <TabsContent value="linkedin" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable LinkedIn card</Label>
                    <Switch
                      checked={socialConfig.linkedin?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleNetworkToggle("linkedin", checked)
                      }
                    />
                  </div>
                  {socialConfig.linkedin?.enabled && (
                    <div className="space-y-1">
                      <Label htmlFor="linkedin-url" className="text-xs">
                        LinkedIn page URL
                      </Label>
                      <Input
                        id="linkedin-url"
                        placeholder="https://linkedin.com/company/yourcompany"
                        value={socialConfig.linkedin?.pageUrl ?? ""}
                        onChange={(e) =>
                          handleNetworkUpdate(
                            "linkedin",
                            "pageUrl",
                            e.target.value,
                          )
                        }
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div>{renderLinkedInPreview()}</div>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable WhatsApp sharing</Label>
                    <Switch
                      checked={socialConfig.whatsapp?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleNetworkToggle("whatsapp", checked)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uses the page cover image and title for WhatsApp shares.
                  </p>
                  <div>{renderWhatsAppPreview()}</div>
                </div>
              </TabsContent>

              <TabsContent value="pinterest" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable Pinterest</Label>
                    <Switch
                      checked={socialConfig.pinterest?.enabled ?? false}
                      onCheckedChange={(checked) =>
                        handleNetworkToggle("pinterest", checked)
                      }
                    />
                  </div>
                  {socialConfig.pinterest?.enabled && (
                    <div className="space-y-1">
                      <Label htmlFor="pinterest-handle" className="text-xs">
                        Pinterest handle
                      </Label>
                      <Input
                        id="pinterest-handle"
                        placeholder="yourpinteresthandle"
                        value={socialConfig.pinterest?.handle ?? ""}
                        onChange={(e) =>
                          handleNetworkUpdate(
                            "pinterest",
                            "handle",
                            e.target.value,
                          )
                        }
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div>{renderPinterestPreview()}</div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      )}
    </div>
  );
}
