"use client";

import { createContext, useContext } from "react";

/**
 * When editing a graph-only linear chain, recompiles should reuse entry + action
 * node UUIDs (matches {@link compileLinearStepsToFlowGraph} options).
 */
export type AutomationFlowCompileStableIds = {
  entryId: string;
  actionNodeIds: string[];
};

const AutomationFlowCompileMetaContext =
  createContext<AutomationFlowCompileStableIds | null>(null);

export function AutomationFlowCompileMetaProvider({
  value,
  children,
}: {
  value: AutomationFlowCompileStableIds | null;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <AutomationFlowCompileMetaContext.Provider value={value}>
      {children}
    </AutomationFlowCompileMetaContext.Provider>
  );
}

export function useAutomationFlowCompileStableIds(): AutomationFlowCompileStableIds | null {
  return useContext(AutomationFlowCompileMetaContext);
}
