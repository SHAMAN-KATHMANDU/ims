import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ButtonBaseProps = Omit<ComponentProps<typeof Button>, "children">;

export interface SubmitButtonProps extends ButtonBaseProps {
  isLoading?: boolean;
  /** Label shown in idle state, e.g. "Save" */
  label: string;
  /** Label shown while loading, e.g. "Saving..." (defaults to label + "...") */
  loadingLabel?: string;
  /** Optional icon to show before the idle label. */
  icon?: ReactNode;
}

export function SubmitButton({
  isLoading,
  label,
  loadingLabel,
  icon,
  disabled,
  className,
  type = "submit",
  ...rest
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || isLoading}
      className={className}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? `${label}...`}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </>
      )}
    </Button>
  );
}
