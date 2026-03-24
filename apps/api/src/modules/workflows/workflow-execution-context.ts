import { AsyncLocalStorage } from "node:async_hooks";

/** Max nested workflow runs (e.g. STAGE_ENTER → MOVE_STAGE → STAGE_ENTER). */
export const MAX_WORKFLOW_NESTING_DEPTH = 5;

interface WorkflowExecutionStore {
  depth: number;
}

const storage = new AsyncLocalStorage<WorkflowExecutionStore>();

export function getWorkflowNestingDepth(): number {
  return storage.getStore()?.depth ?? 0;
}

/** True when nested workflow rules should not run (stage change still applies). */
export function shouldSkipWorkflowRules(): boolean {
  return getWorkflowNestingDepth() >= MAX_WORKFLOW_NESTING_DEPTH;
}

export async function runWithIncreasedWorkflowNestingDepth<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const parent = storage.getStore();
  const depth = (parent?.depth ?? 0) + 1;
  return storage.run({ depth }, fn);
}
