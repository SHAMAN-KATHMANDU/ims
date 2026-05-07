/**
 * Draft persistence helpers.
 *
 * Stores editor drafts in localStorage with the key format:
 * `siteEditor.draft.${tenantId}.${scope}`
 *
 * The exact key format is preserved so existing in-flight drafts survive the rewrite.
 */

import type { BlockNode } from "@repo/shared";

export interface PersistedDraft {
  blocks: BlockNode[];
  savedAt: number;
}

function getStorageKey(tenantId: string, scope: string): string {
  return `siteEditor.draft.${tenantId}.${scope}`;
}

export function getPersistedDraft(
  tenantId: string,
  scope: string,
): PersistedDraft | null {
  if (typeof localStorage === "undefined") return null;
  const key = getStorageKey(tenantId, scope);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedDraft;
  } catch {
    return null;
  }
}

export function persistDraft(
  tenantId: string,
  scope: string,
  blocks: BlockNode[],
): void {
  if (typeof localStorage === "undefined") return;
  const key = getStorageKey(tenantId, scope);
  const draft: PersistedDraft = {
    blocks,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage quota exceeded or localStorage unavailable
  }
}

export function clearPersistedDraft(tenantId: string, scope: string): void {
  if (typeof localStorage === "undefined") return;
  const key = getStorageKey(tenantId, scope);
  localStorage.removeItem(key);
}
