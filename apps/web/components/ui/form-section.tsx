import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn("mb-8 last:mb-0", className)}>
      <div className="form-section-title">{title}</div>
      {children}
    </div>
  );
}
