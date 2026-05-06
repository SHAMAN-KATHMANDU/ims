/**
 * Shared shape for every inline editor in the CMS body editor.
 *
 * Each inline editor is a controlled, store-agnostic component:
 * given the current block's props, render an editing UI; on every
 * change, call `onChange(nextProps)`. The store (`content-editor-store`)
 * dispatches the patch to `updateBlockProps` — but the inline editors
 * never touch the store directly so they're trivial to test.
 */

export interface InlineEditorProps<P> {
  blockId: string;
  props: P;
  onChange: (next: P) => void;
  disabled?: boolean;
}
