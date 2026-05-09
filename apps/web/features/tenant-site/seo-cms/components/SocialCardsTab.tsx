"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function SocialCardsTab() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Open Graph default</Label>
          <div
            className="aspect-video rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-end justify-start p-6"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.06 50), oklch(0.18 0.04 30))",
            }}
          >
            <div className="text-white text-2xl font-semibold font-serif">
              Lumen & Coal
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Replace OG image
          </Button>
          <p className="text-xs text-muted-foreground">
            Recommended: 1200×630 pixels
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">X / Twitter card</Label>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Card type
              </label>
              <select className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                <option>Summary, large image</option>
                <option>Summary</option>
                <option>App</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Handle
              </label>
              <input
                type="text"
                placeholder="@lumenandcoal"
                defaultValue="@lumenandcoal"
                className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
