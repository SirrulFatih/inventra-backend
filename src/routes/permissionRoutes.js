const express = require("express");

const roleController = require("../controllers/roleController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.get("/", authMiddleware, checkPermission("manage_users"), roleController.getAllPermissions);

module.exports = router;
