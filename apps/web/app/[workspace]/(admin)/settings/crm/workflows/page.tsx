import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { WorkflowEditorPage } from "@/features/crm";

export const metadata = { title: "Pipeline Workflows" };

/** Pipeline workflow automation – admin/superAdmin only. */
export default function WorkflowsPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <WorkflowEditorPage />
    </AuthGuard>
  );
}
