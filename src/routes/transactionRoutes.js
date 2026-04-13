const express = require("express");

const transactionController = require("../controllers/transactionController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {
  validateCreateTransactionPayload,
  validateTransactionIdParam,
  validateTransactionListQuery
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", validateCreateTransactionPayload, transactionController.createTransaction);
router.get("/", validateTransactionListQuery, transactionController.getAllTransactions);
router.get("/:id", validateTransactionIdParam, transactionController.getTransactionById);
router.patch(
  "/:id/approve",
  checkPermission("approve_transaction"),
  validateTransactionIdParam,
  transactionController.approveTransaction
);
router.patch(
  "/:id/reject",
  checkPermission("approve_transaction"),
  validateTransactionIdParam,
  transactionController.rejectTransaction
);

module.exports = router;
