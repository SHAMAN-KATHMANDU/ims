"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BlockNode } from "@repo/shared";
import { useSiteLayouts } from "../../hooks/use-site-layouts";
import {
  formBlocksService,
  type FormBlockInfo,
} from "../services/form-blocks.service";

export const formBlocksKeys = {
  all: ["form-blocks"] as const,
  list: () => [...formBlocksKeys.all, "list"] as const,
  submissions: (formId: string) =>
    [...formBlocksKeys.all, "submissions", formId] as const,
};

function extractFormBlocks(
  layouts: Array<{
    scope: string;
    pageId?: string | null;
    blocks?: unknown;
    draftBlocks?: unknown;
  }>,
): FormBlockInfo[] {
  const forms: FormBlockInfo[] = [];
  const formIds = new Set<string>();

  layouts.forEach((layout) => {
    const scope = layout.scope as string;
    const pageId = layout.pageId ?? undefined;

    function walkBlocks(blocks: BlockNode[] | undefined): void {
      if (!blocks) return;

      blocks.forEach((block) => {
        if (block.kind === "form") {
          const props = block.props as Record<string, unknown>;
          const formId = (props.formId as string) ?? `form-${block.id}`;
          const name = (props.title as string) ?? `Form ${block.id}`;

          if (!formIds.has(formId)) {
            formIds.add(formId);
            forms.push({
              formId,
              name,
              scope: scope as
                | "page"
                | "footer"
                | "header"
                | "home"
                | "contact"
                | "offers"
                | "not-found"
                | "cart"
                | "products-index"
                | "product-detail"
                | "blog-index"
                | "blog-post"
                | "404"
                | "landing",
              pageId,
              fieldsCount: 0,
              submissionsCount: 0,
            });
          }
        }

        if (block.children) {
          walkBlocks(block.children);
        }
      });
    }

    walkBlocks(
      Array.isArray(layout.blocks) ? (layout.blocks as BlockNode[]) : undefined,
    );
    walkBlocks(
      Array.isArray(layout.draftBlocks)
        ? (layout.draftBlocks as BlockNode[])
        : undefined,
    );
  });

  return forms;
}

export function useFormBlocks() {
  const { data: layouts } = useSiteLayouts();

  return useMemo(() => {
    return extractFormBlocks(layouts ?? []);
  }, [layouts]);
}

export function useFormSubmissions(
  formId: string,
  params?: { page?: number; limit?: number; from?: string; to?: string },
) {
  return useQuery({
    queryKey: formBlocksKeys.submissions(formId),
    queryFn: () => formBlocksService.getFormSubmissions(formId, params),
    enabled: !!formId,
  });
}
