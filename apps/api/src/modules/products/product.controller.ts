/**
 * Product controller: barrel that composes split controllers.
 * Keeps a single default export for the router and bulk.controller.
 */

import * as crud from "./product.crud.controller";
import * as update from "./product.update.controller";
import * as discount from "./product.discount.controller";
import * as bulk from "./product.bulk.controller";

const productController = {
  ...crud,
  ...update,
  ...discount,
  ...bulk,
};

export default productController;
