import type { JSX } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface TiptapEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
}

export function TiptapEditor({
  initialContent = "",
  onChange,
}: TiptapEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing…",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: 16,
        minHeight: 400,
        backgroundColor: "var(--bg)",
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
