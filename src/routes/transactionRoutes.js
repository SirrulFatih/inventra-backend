const express = require("express");

const transactionController = require("../controllers/transactionController");
const { authMiddleware } = require("../middlewares/authMiddleware");
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

module.exports = router;
