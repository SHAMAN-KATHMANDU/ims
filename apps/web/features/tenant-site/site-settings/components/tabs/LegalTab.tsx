"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import {
  useSiteConfig,
  useUpdateSiteConfig,
} from "../../../hooks/use-tenant-site";

export function LegalTab() {
  const { toast } = useToast();
  const { data: siteConfig, isLoading } = useSiteConfig();
  const updateSiteConfig = useUpdateSiteConfig();

  const [termsUrl, setTermsUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [cookieText, setCookieText] = useState("");

  const contactData = useMemo(
    () => (siteConfig?.contact ?? {}) as Record<string, unknown>,
    [siteConfig?.contact],
  );

  useEffect(() => {
    if (contactData) {
      setTermsUrl((contactData.termsUrl as string) ?? "");
      setPrivacyUrl((contactData.privacyUrl as string) ?? "");
      setShowCookieBanner((contactData.showCookieBanner as boolean) ?? true);
      setCookieText((contactData.cookieBannerText as string) ?? "");
    }
  }, [contactData]);

  const handleSave = async () => {
    try {
      await updateSiteConfig.mutateAsync({
        contact: {
          ...contactData,
          termsUrl: termsUrl.trim() || null,
          privacyUrl: privacyUrl.trim() || null,
          showCookieBanner,
          cookieBannerText: cookieText.trim(),
        },
      });
      toast({ title: "Legal settings saved" });
    } catch {
      toast({
        title: "Failed to save legal settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading legal settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="mb-4">
          <h3 className="font-semibold">Legal links</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy policy URL</Label>
            <Input
              id="privacy"
              type="url"
              placeholder="https://…"
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              disabled={updateSiteConfig.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terms">Terms of service URL</Label>
            <Input
              id="terms"
              type="url"
              placeholder="https://…"
              value={termsUrl}
              onChange={(e) => setTermsUrl(e.target.value)}
              disabled={updateSiteConfig.isPending}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="mb-4">
          <h3 className="font-semibold">Cookie banner</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="cookie-banner"
              checked={showCookieBanner}
              onCheckedChange={setShowCookieBanner}
              disabled={updateSiteConfig.isPending}
            />
            <Label htmlFor="cookie-banner" className="cursor-pointer flex-1">
              Show cookie banner
            </Label>
          </div>
          {showCookieBanner && (
            <div className="space-y-2">
              <Label htmlFor="cookie-text">Banner text</Label>
              <Textarea
                id="cookie-text"
                placeholder="We use cookies to enhance your experience…"
                value={cookieText}
                onChange={(e) => setCookieText(e.target.value)}
                rows={3}
                disabled={updateSiteConfig.isPending}
              />
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSiteConfig.isPending}>
          {updateSiteConfig.isPending ? "Saving…" : "Save legal settings"}
        </Button>
      </div>
    </div>
  );
}
