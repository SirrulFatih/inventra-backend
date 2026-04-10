const express = require("express");

const itemController = require("../controllers/itemController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const {
  validateItemIdParam,
  validateItemListQuery,
  validateCreateItemPayload,
  validateUpdateItemPayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", validateCreateItemPayload, itemController.createItem);
router.get("/", validateItemListQuery, itemController.getAllItems);
router.get("/:id", validateItemIdParam, itemController.getItemById);
router.put("/:id", validateItemIdParam, validateUpdateItemPayload, itemController.updateItem);
router.delete("/:id", validateItemIdParam, roleMiddleware("admin"), itemController.deleteItem);

module.exports = router;
