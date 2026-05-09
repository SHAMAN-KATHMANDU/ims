"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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

interface SocialConfig {
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
  const updateSiteConfig = useUpdateSiteConfig();
  const uploadMedia = useUploadMedia();
  const updatePage = useUpdatePage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const seoData = (siteConfig?.seo ?? {}) as Record<string, unknown>;
  const socialConfig: SocialConfig = (seoData.social ?? {}) as SocialConfig;
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

  const updateSocialConfig = (
    network: keyof SocialConfig,
    updates: Partial<SocialConfig[keyof SocialConfig]>,
  ) => {
    const nextSocial: SocialConfig = {
      ...socialConfig,
      [network]: {
        ...(socialConfig[network] as Record<string, unknown>),
        ...updates,
      },
    };
    updateSiteConfig.mutate(
      { seo: { ...seoData, social: nextSocial } },
      {
        onSuccess: () => {
          toast({ title: `${network} settings saved` });
        },
        onError: () => {
          toast({
            title: "Failed to save settings",
            variant: "destructive",
          });
        },
      },
    );
  };

  const selectedPage = pages.find((p: TenantPage) => p.id === selectedPageId);
  const coverImageUrl = selectedPage?.coverImageUrl;

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
          <Label className="text-sm font-semibold">Cover image</Label>
          <div className="space-y-2">
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {coverImageUrl ? (
                <Image
                  src={coverImageUrl}
                  alt="Cover preview"
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
              Recommended: 1200×630 pixels (used across all networks)
            </p>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <Label className="text-sm font-semibold">Social network settings</Label>
        <Tabs defaultValue="twitter" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="twitter">Twitter</TabsTrigger>
            <TabsTrigger value="facebook">Facebook & OG</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="pinterest">Pinterest</TabsTrigger>
          </TabsList>

          <TabsContent value="twitter" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="twitter-enabled" className="text-sm">
                Enable Twitter card
              </Label>
              <Switch
                id="twitter-enabled"
                checked={socialConfig.twitter?.enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSocialConfig("twitter", { enabled: checked })
                }
              />
            </div>
            {socialConfig.twitter?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="twitter-handle" className="text-xs">
                    Twitter handle
                  </Label>
                  <Input
                    id="twitter-handle"
                    placeholder="@yourhandle"
                    value={socialConfig.twitter?.handle ?? ""}
                    onChange={(e) =>
                      updateSocialConfig("twitter", { handle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Preview (1200×675)</Label>
                  <Card className="p-4 bg-muted/30 space-y-2 aspect-video flex flex-col justify-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      twitter.com
                    </div>
                    <div className="text-sm font-medium line-clamp-2">
                      {selectedPage?.title}
                    </div>
                    {socialConfig.twitter?.handle && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {socialConfig.twitter.handle}
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="facebook" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="facebook-enabled" className="text-sm">
                Enable Facebook & Open Graph
              </Label>
              <Switch
                id="facebook-enabled"
                checked={socialConfig.facebook?.enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSocialConfig("facebook", { enabled: checked })
                }
              />
            </div>
            {socialConfig.facebook?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="facebook-url" className="text-xs">
                    Facebook page URL
                  </Label>
                  <Input
                    id="facebook-url"
                    placeholder="https://facebook.com/yourpage"
                    value={socialConfig.facebook?.pageUrl ?? ""}
                    onChange={(e) =>
                      updateSocialConfig("facebook", {
                        pageUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Preview (1200×630 OG)</Label>
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                    {coverImageUrl ? (
                      <Image
                        src={coverImageUrl}
                        alt="Facebook OG preview"
                        width={400}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-xs">No image</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="linkedin" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="linkedin-enabled" className="text-sm">
                Enable LinkedIn
              </Label>
              <Switch
                id="linkedin-enabled"
                checked={socialConfig.linkedin?.enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSocialConfig("linkedin", { enabled: checked })
                }
              />
            </div>
            {socialConfig.linkedin?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url" className="text-xs">
                    LinkedIn page URL
                  </Label>
                  <Input
                    id="linkedin-url"
                    placeholder="https://linkedin.com/company/yourcompany"
                    value={socialConfig.linkedin?.pageUrl ?? ""}
                    onChange={(e) =>
                      updateSocialConfig("linkedin", {
                        pageUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Preview (1200×627 LinkedIn)</Label>
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                    {coverImageUrl ? (
                      <Image
                        src={coverImageUrl}
                        alt="LinkedIn preview"
                        width={400}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-xs">No image</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsapp-enabled" className="text-sm">
                Enable WhatsApp sharing
              </Label>
              <Switch
                id="whatsapp-enabled"
                checked={socialConfig.whatsapp?.enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSocialConfig("whatsapp", { enabled: checked })
                }
              />
            </div>
            {socialConfig.whatsapp?.enabled && (
              <div className="space-y-2">
                <Label className="text-xs">Preview (400×400 WhatsApp)</Label>
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                  {coverImageUrl ? (
                    <Image
                      src={coverImageUrl}
                      alt="WhatsApp preview"
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <div className="text-xs">No image</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pinterest" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pinterest-enabled" className="text-sm">
                Enable Pinterest
              </Label>
              <Switch
                id="pinterest-enabled"
                checked={socialConfig.pinterest?.enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSocialConfig("pinterest", { enabled: checked })
                }
              />
            </div>
            {socialConfig.pinterest?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pinterest-handle" className="text-xs">
                    Pinterest handle
                  </Label>
                  <Input
                    id="pinterest-handle"
                    placeholder="@yourpinterest"
                    value={socialConfig.pinterest?.handle ?? ""}
                    onChange={(e) =>
                      updateSocialConfig("pinterest", {
                        handle: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    Preview (1000×1500 Pinterest)
                  </Label>
                  <div
                    className="w-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden border"
                    style={{ aspectRatio: "1000/1500" }}
                  >
                    {coverImageUrl ? (
                      <Image
                        src={coverImageUrl}
                        alt="Pinterest preview"
                        width={133}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <div className="text-xs">No image</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
