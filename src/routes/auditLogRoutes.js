const express = require("express");

const auditLogController = require("../controllers/auditLogController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkAnyPermission } = require("../middlewares/permissionMiddleware");
const { validateAuditLogListQuery } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", checkAnyPermission(["read_audit_logs", "view_audit_logs"]), validateAuditLogListQuery, auditLogController.getAllAuditLogs);

module.exports = router;
