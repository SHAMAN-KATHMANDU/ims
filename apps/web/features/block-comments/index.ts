/**
 * `features/block-comments` — Phase 6 inline review threads.
 */

export { CommentsSheet } from "./components/CommentsSheet";
export {
  useBlockComments,
  useCreateBlockComment,
  useResolveBlockComment,
  useReopenBlockComment,
  useDeleteBlockComment,
  blockCommentsKeys,
} from "./hooks/use-block-comments";
export type {
  BlockCommentRow,
  CommentRecordType,
  CreateCommentInput,
  ListCommentsQuery,
} from "./services/block-comments.service";
