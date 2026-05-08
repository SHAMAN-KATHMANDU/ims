"use client";

import type { JSX } from "react";

interface HrProps extends React.HTMLAttributes<HTMLDivElement> {
  vert?: boolean;
}

export function Hr({ vert = false, style, ...rest }: HrProps): JSX.Element {
  return (
    <div
      {...rest}
      style={
        vert
          ? {
              width: 1,
              alignSelf: "stretch",
              background: "var(--line)",
              ...(style || {}),
            }
          : {
              height: 1,
              background: "var(--line)",
              ...(style || {}),
            }
      }
    />
  );
}
