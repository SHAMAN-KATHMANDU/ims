"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check, MoreVertical } from "lucide-react";
import { TemplateThumbnail } from "./TemplateThumbnail";
import type { SiteTemplate } from "../../services/site-templates.service";

interface TemplateCardProps {
  template: SiteTemplate;
  isActive: boolean;
  currentTenantId: string;
  onApply: (slug: string) => void;
  onForkClick: (id: string, name: string) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

export function TemplateCard({
  template,
  isActive,
  currentTenantId,
  onApply,
  onForkClick,
  onEditClick,
  onDeleteClick,
}: TemplateCardProps) {
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [forkName, setForkName] = useState(template.name);

  const isOwnedByTenant = template.ownerTenantId === currentTenantId;
  const isFork = template.ownerTenantId !== null;

  return (
    <>
      <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <TemplateThumbnail slug={template.slug} />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-lg font-serif text-gray-900">
                {template.name}
              </h3>
              {template.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {template.description}
                </p>
              )}
            </div>
            {/* Fork badge for tenant-owned templates */}
            {isFork && (
              <Badge variant="secondary" className="flex-shrink-0">
                Forked
              </Badge>
            )}
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {isActive ? (
              <>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Current
                </Badge>
                <Button size="sm" variant="outline" disabled className="flex-1">
                  Active
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => onApply(template.slug)}
                className="flex-1"
              >
                Apply
              </Button>
            )}

            {/* Action menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isFork && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setForkName(template.name);
                        setShowForkDialog(true);
                      }}
                    >
                      Fork & Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isOwnedByTenant && (
                  <>
                    <DropdownMenuItem onClick={() => onEditClick(template.id)}>
                      Edit Fork
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteClick(template.id)}
                      className="text-red-600"
                    >
                      Delete Fork
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Fork dialog */}
      {showForkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Fork Template</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={forkName}
                  onChange={(e) => setForkName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowForkDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onForkClick(template.id, forkName);
                    setShowForkDialog(false);
                  }}
                >
                  Fork
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
