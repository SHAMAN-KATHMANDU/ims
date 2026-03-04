export { TrashPage } from "./components/TrashPage";
export {
  useTrashItems,
  useRestoreTrashItem,
  usePermanentlyDeleteTrashItem,
  trashKeys,
} from "./hooks/use-trash";
export {
  getTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
} from "./services/trash.service";
export type { TrashItem, TrashListParams, TrashListResponse } from "./types";
