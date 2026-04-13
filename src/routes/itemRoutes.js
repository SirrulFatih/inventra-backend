const express = require("express");

const itemController = require("../controllers/itemController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {
  validateItemIdParam,
  validateItemListQuery,
  validateCreateItemPayload,
  validateUpdateItemPayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", checkPermission("manage_items"), validateCreateItemPayload, itemController.createItem);
router.get("/", checkPermission("manage_items"), validateItemListQuery, itemController.getAllItems);
router.get("/:id", checkPermission("manage_items"), validateItemIdParam, itemController.getItemById);
router.put("/:id", checkPermission("manage_items"), validateItemIdParam, validateUpdateItemPayload, itemController.updateItem);
router.delete("/:id", checkPermission("manage_items"), validateItemIdParam, itemController.deleteItem);

module.exports = router;
