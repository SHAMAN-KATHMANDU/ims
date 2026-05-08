"use client";

import type { ReactNode, JSX } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({
  children,
  padded = false,
  style,
  ...rest
}: CardProps): JSX.Element {
  return (
    <div
      {...rest}
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        ...(padded ? { padding: 16 } : {}),
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}
