import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import attributeTypeController from "./attribute-type.controller";

const router = Router();

router.use(authorizeRoles("admin", "superAdmin"));

router.get("/", asyncHandler(attributeTypeController.list));
router.post("/", asyncHandler(attributeTypeController.create));
router.get("/:typeId/values", asyncHandler(attributeTypeController.listValues));
router.post(
  "/:typeId/values",
  asyncHandler(attributeTypeController.createValue),
);
router.put(
  "/:typeId/values/:valueId",
  asyncHandler(attributeTypeController.updateValue),
);
router.delete(
  "/:typeId/values/:valueId",
  asyncHandler(attributeTypeController.deleteValue),
);
router.get("/:id", asyncHandler(attributeTypeController.getById));
router.put("/:id", asyncHandler(attributeTypeController.update));
router.delete("/:id", asyncHandler(attributeTypeController.delete));

export default router;
