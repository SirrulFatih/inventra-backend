const express = require("express");

const auditLogController = require("../controllers/auditLogController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const { validateAuditLogListQuery } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware, checkPermission("view_audit_logs"));

router.get("/", validateAuditLogListQuery, auditLogController.getAllAuditLogs);

module.exports = router;
