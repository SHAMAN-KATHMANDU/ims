/**
 * Nav menu dock query hook.
 * Reuse existing nav-menus service.
 */

export {
  useNavMenus,
  useUpsertNavMenu,
  useDeleteNavMenu,
  navMenuKeys,
} from "../../hooks/use-nav-menus";

export type { NavMenuRow as NavMenu } from "../../services/nav-menus.service";
