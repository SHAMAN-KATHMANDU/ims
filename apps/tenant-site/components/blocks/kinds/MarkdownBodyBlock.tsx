/**
 * markdown-body block — wraps the existing blog MarkdownBody component so
 * tenant custom pages can continue to author in markdown while living inside
 * a block tree. This is the bridge block that lets us migrate existing
 * TenantPages into SiteLayout rows without changing their content model.
 */

import type { MarkdownBodyProps } from "@repo/shared";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import type { BlockComponentProps } from "../registry";
export type { BlockComponentProps };

const MAX_WIDTH_PX: Record<
  NonNullable<MarkdownBodyProps["maxWidth"]>,
  number
> = {
  narrow: 640,
  default: 820,
  wide: 1200,
};

export function MarkdownBodyBlock({
  props,
}: BlockComponentProps<MarkdownBodyProps>) {
  const maxWidth = MAX_WIDTH_PX[props.maxWidth ?? "default"];
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
      }}
    >
      <MarkdownBody source={props.source} />
    </div>
  );
}
