import type { UseFormReturn } from "react-hook-form";
import type { AutomationActionTypeValue } from "@repo/shared";
import { getDefaultActionConfig } from "./automation-action-config-fields";
import type { AutomationDefinitionFormValues } from "../validation";

/**
 * Exits branching canvas authoring: clears the preserved graph and restores a
 * single linear step (first compatible action type).
 */
export function exitBranchingToLinear(
  form: UseFormReturn<AutomationDefinitionFormValues>,
  compatibleActionTypes: AutomationActionTypeValue[],
): void {
  const first =
    compatibleActionTypes[0] ??
    ("notification.send" as AutomationActionTypeValue);
  form.setValue("branchingCanvasAuthoring", false, { shouldValidate: true });
  form.setValue("preservedBranchingFlowGraph", undefined, {
    shouldValidate: true,
  });
  form.setValue(
    "steps",
    [
      {
        actionType: first,
        actionConfig: getDefaultActionConfig(first),
        continueOnError: false,
      },
    ],
    { shouldValidate: true },
  );
}
