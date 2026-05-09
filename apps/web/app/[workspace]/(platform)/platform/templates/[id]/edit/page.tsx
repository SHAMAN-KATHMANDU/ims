import { TemplateEditorPage } from "@/features/tenant-site/templates/components/TemplateEditorPage";

interface PageProps {
  params: {
    workspace: string;
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return <TemplateEditorPage templateId={params.id} isPlatformAdmin={true} />;
}
