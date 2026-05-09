"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

const TITLE_LIMIT = 55;
const DESC_LIMIT = 155;

export function MetaDefaultsTab() {
  const { toast } = useToast();
  const [title, setTitle] = useState("Lumen & Coal");
  const [description, setDescription] = useState(
    "A wood-fired tasting room in the West Village. Reservations open 30 days out.",
  );
  const [keywords, setKeywords] = useState(
    "restaurant, tasting menu, wood fire",
  );
  const [twitterHandle, setTwitterHandle] = useState("@lumenandcoal");

  const handleSave = () => {
    toast({ title: "SEO defaults saved" });
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="title">Site title format</Label>
            <span className="text-xs text-muted-foreground">
              {title.length}/{TITLE_LIMIT}
            </span>
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_LIMIT))}
            placeholder="Your site — short description"
          />
          <p className="text-xs text-muted-foreground">
            Appears in browser tabs and as the main link on search results.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="description">Meta description</Label>
            <span className="text-xs text-muted-foreground">
              {description.length}/{DESC_LIMIT}
            </span>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value.slice(0, DESC_LIMIT))
            }
            placeholder="A brief description of your site"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            The snippet shown under your title in search results.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords</Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="keyword1, keyword2, keyword3"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. Mostly for legacy purposes.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="twitter">Twitter / X handle</Label>
          <Input
            id="twitter"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            placeholder="@yourhandle"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save SEO defaults</Button>
        </div>
      </div>

      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Search preview
        </div>
        <Card className="p-3 space-y-2 bg-muted/30">
          <div className="text-xs text-blue-600 dark:text-blue-400 line-clamp-1">
            lumenandcoal.com › page
          </div>
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 line-clamp-2">
            {title || "Your site"}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-3">
            {description || "Description appears here…"}
          </div>
        </Card>
      </div>
    </div>
  );
}
