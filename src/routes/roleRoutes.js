const express = require("express");

const roleController = require("../controllers/roleController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkAnyPermission, checkPermission } = require("../middlewares/permissionMiddleware");
const {
  validateRoleIdParam,
  validateCreateRolePayload,
  validateUpdateRolePayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", checkAnyPermission(["manage_users", "manage_roles"]), roleController.getAllRoles);
router.post("/", checkPermission("manage_roles"), validateCreateRolePayload, roleController.createRole);
router.put("/:id", checkPermission("manage_roles"), validateRoleIdParam, validateUpdateRolePayload, roleController.updateRole);
router.delete("/:id", checkPermission("manage_roles"), validateRoleIdParam, roleController.deleteRole);

module.exports = router;
