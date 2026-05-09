"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";

export function GeneralTab() {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState("Lumen & Coal");
  const [tagline, setTagline] = useState(
    "A wood-fired tasting room in the West Village.",
  );
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("English (US)");
  const [address, setAddress] = useState("142 Charles St, New York, NY 10014");
  const [phone, setPhone] = useState("+1 (212) 555-0127");
  const [email, setEmail] = useState("reservations@lumenandcoal.com");

  const handleSave = () => {
    toast({ title: "Settings saved" });
  };

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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
              <SelectItem value="America/Los_Angeles">
                America/Los_Angeles
              </SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Default language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English (US)">English (US)</SelectItem>
              <SelectItem value="English (UK)">English (UK)</SelectItem>
              <SelectItem value="Français">Français</SelectItem>
              <SelectItem value="Español">Español</SelectItem>
            </SelectContent>
          </Select>
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Contact email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save settings</Button>
      </div>
    </div>
  );
}
