const express = require("express");

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {
	validateRegisterPayload,
	validateLoginPayload,
	validateCreateUserPayload,
	validateUserIdParam,
	validateUpdateUserPayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.post("/register", validateRegisterPayload, authController.register);
router.post("/login", validateLoginPayload, authController.login);
router.post("/", authMiddleware, checkPermission("manage_users"), validateCreateUserPayload, userController.createUser);

router.get("/", authMiddleware, checkPermission("manage_users"), userController.getAllUsers);
router.get("/:id", authMiddleware, checkPermission("manage_users"), validateUserIdParam, userController.getUserById);
router.put("/:id", authMiddleware, checkPermission("manage_users"), validateUserIdParam, validateUpdateUserPayload, userController.updateUser);
router.delete("/:id", authMiddleware, checkPermission("manage_users"), validateUserIdParam, userController.deleteUser);

module.exports = router;
