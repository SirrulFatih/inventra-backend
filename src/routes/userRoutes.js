const express = require("express");

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const {
	validateRegisterPayload,
	validateLoginPayload,
	validateUserIdParam,
	validateUpdateUserPayload
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.post("/register", validateRegisterPayload, authController.register);
router.post("/login", validateLoginPayload, authController.login);

router.get("/", authMiddleware, roleMiddleware("admin"), userController.getAllUsers);
router.get("/:id", authMiddleware, validateUserIdParam, userController.getUserById);
router.put("/:id", authMiddleware, validateUserIdParam, validateUpdateUserPayload, userController.updateUser);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), validateUserIdParam, userController.deleteUser);

module.exports = router;
