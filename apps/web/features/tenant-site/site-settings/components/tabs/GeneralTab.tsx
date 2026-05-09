"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  useSiteConfig,
  useUpdateSiteConfig,
} from "../../../hooks/use-tenant-site";

export function GeneralTab() {
  const { toast } = useToast();
  const { data: siteConfig, isLoading } = useSiteConfig();
  const updateSiteConfig = useUpdateSiteConfig();

  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const contactData = useMemo(
    () => (siteConfig?.contact ?? {}) as Record<string, unknown>,
    [siteConfig?.contact],
  );

  useEffect(() => {
    if (contactData) {
      setSiteName((contactData.siteName as string) ?? "");
      setTagline((contactData.tagline as string) ?? "");
      setAddress((contactData.address as string) ?? "");
      setPhone((contactData.phone as string) ?? "");
      setEmail((contactData.email as string) ?? "");
    }
  }, [contactData]);

  const handleSave = async () => {
    try {
      await updateSiteConfig.mutateAsync({
        contact: {
          siteName: siteName.trim(),
          tagline: tagline.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
      });
      toast({ title: "Settings saved" });
    } catch {
      toast({
        title: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading settings…</div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="mb-4">
          <h3 className="font-semibold">Site identity</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Site name</Label>
          <Input
            id="name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            disabled={updateSiteConfig.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            disabled={updateSiteConfig.isPending}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="mb-4">
          <h3 className="font-semibold">Contact</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            disabled={updateSiteConfig.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={updateSiteConfig.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Contact email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={updateSiteConfig.isPending}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSiteConfig.isPending}>
          {updateSiteConfig.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
