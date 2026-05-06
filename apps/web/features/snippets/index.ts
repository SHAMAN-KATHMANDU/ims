/**
 * `features/snippets` — reusable BlockNode[] sub-trees (Phase 5 CMS).
 */

export { SnippetsListPage } from "./components/SnippetsListPage";
export { SnippetEditorPage } from "./components/SnippetEditorPage";

export {
  useSnippets,
  useSnippet,
  useCreateSnippet,
  useUpdateSnippet,
  useDeleteSnippet,
  snippetsKeys,
} from "./hooks/use-snippets";

export type {
  Snippet,
  SnippetListItem,
  CreateSnippetData,
  UpdateSnippetData,
} from "./services/snippets.service";
export { listSnippets } from "./services/snippets.service";

export {
  SnippetFormSchema,
  slugifyTitle,
  type SnippetFormInput,
} from "./validation";
