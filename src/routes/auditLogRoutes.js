const express = require("express");

const auditLogController = require("../controllers/auditLogController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { validateAuditLogListQuery } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("admin"));

router.get("/", validateAuditLogListQuery, auditLogController.getAllAuditLogs);

module.exports = router;
