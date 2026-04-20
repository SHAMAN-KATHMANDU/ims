import type { CustomHtmlProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

export function CustomHtmlBlock({
  props,
  node,
}: BlockComponentProps<CustomHtmlProps>) {
  return (
    <div id={node.id}>
      {props.css && <style dangerouslySetInnerHTML={{ __html: props.css }} />}
      <div dangerouslySetInnerHTML={{ __html: props.html }} />
    </div>
  );
}
