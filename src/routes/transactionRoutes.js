const express = require("express");

const transactionController = require("../controllers/transactionController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { checkAnyPermission } = require("../middlewares/permissionMiddleware");
const {
  validateCreateTransactionPayload,
  validateTransactionIdParam,
  validateTransactionListQuery
} = require("../middlewares/validationMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  checkAnyPermission(["create_transaction", "manage_transactions"]),
  validateCreateTransactionPayload,
  transactionController.createTransaction
);
router.get("/", checkAnyPermission(["read_transactions", "manage_transactions"]), validateTransactionListQuery, transactionController.getAllTransactions);
router.get("/:id", checkAnyPermission(["read_transactions", "manage_transactions"]), validateTransactionIdParam, transactionController.getTransactionById);
router.patch(
  "/:id/approve",
  checkAnyPermission(["approve_transaction", "approve_transactions"]),
  validateTransactionIdParam,
  transactionController.approveTransaction
);
router.patch(
  "/:id/reject",
  checkAnyPermission(["approve_transaction", "approve_transactions"]),
  validateTransactionIdParam,
  transactionController.rejectTransaction
);

module.exports = router;
