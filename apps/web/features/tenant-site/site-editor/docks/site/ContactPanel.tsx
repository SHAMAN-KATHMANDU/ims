"use client";

import Link from "next/link";
import { ExternalLink, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Contact</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-foreground mb-1">
              Business Contact Info
            </div>
            <p className="text-xs text-muted-foreground">
              Your business name, phone, email, and address are managed in your
              business profile. Changes there automatically appear on your site.
            </p>
          </div>

          <Link href="../settings/business-profile" className="block">
            <Button className="w-full" variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Manage business profile
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Contact fields used
          </div>
          <div className="space-y-2">
            <div className="flex gap-2 text-xs">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Phone</div>
                <div className="text-muted-foreground">
                  Displayed in footer and contact pages
                </div>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Email</div>
                <div className="text-muted-foreground">
                  Shown in footer; used for contact forms
                </div>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">Address</div>
                <div className="text-muted-foreground">
                  Appears in footer and on map blocks
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
