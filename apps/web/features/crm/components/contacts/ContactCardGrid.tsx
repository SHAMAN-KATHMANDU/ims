"use client";

import type { Contact } from "../../services/contact.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "../shared";
import { cn } from "@/lib/utils";

interface ContactCardGridProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpen: (id: string) => void;
}

export function ContactCardGrid({
  contacts,
  isLoading = false,
  onOpen,
}: ContactCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[200px] rounded-lg border bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-sm">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {contacts.map((contact) => {
        const fullName = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ");
        const initials = (
          contact.firstName.charAt(0) + (contact.lastName?.charAt(0) ?? "")
        ).toUpperCase();

        return (
          <Card
            key={contact.id}
            className={cn(
              "flex cursor-pointer items-center gap-3.5 p-4 transition-shadow hover:border-border hover:shadow-md",
              "bg-card border",
            )}
            onClick={() => onOpen(contact.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                // Space would otherwise scroll the page; match native button behavior.
                e.preventDefault();
                onOpen(contact.id);
              }
            }}
          >
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold truncate">
                {fullName}
              </div>
              {contact.company && (
                <div className="text-[12.5px] text-muted-foreground truncate">
                  {contact.company.name}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TierBadge purchaseCount={contact.purchaseCount} />
                {contact.journeyType && (
                  <Badge variant="secondary" className="text-xs">
                    {contact.journeyType}
                  </Badge>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="font-mono text-lg font-semibold">
                {contact.purchaseCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                purchase{contact.purchaseCount !== 1 ? "s" : ""}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
