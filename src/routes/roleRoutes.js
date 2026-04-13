const express = require("express");

const roleController = require("../controllers/roleController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {
  validateRoleIdParam,
  validateCreateRolePayload,
  validateUpdateRolePayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware, checkPermission("manage_users"));

router.get("/", roleController.getAllRoles);
router.post("/", validateCreateRolePayload, roleController.createRole);
router.put("/:id", validateRoleIdParam, validateUpdateRolePayload, roleController.updateRole);
router.delete("/:id", validateRoleIdParam, roleController.deleteRole);

module.exports = router;
