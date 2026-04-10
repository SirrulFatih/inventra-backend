const transactionService = require("../services/transactionService");
const auditLogService = require("../services/auditLogService");
const { sendSuccess } = require("../utils/response");

const createTransaction = async (req, res, next) => {
  try {
    const payload = req.validatedBody || req.body;

    const transaction = await transactionService.createTransaction({
      ...payload,
      userId: req.user.id
    });

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Transaction",
      recordId: transaction.id,
      description: `Transaction ${transaction.id} created`
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Transaction created successfully",
      data: transaction
    });
  } catch (error) {
    return next(error);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const query = req.validatedQuery || {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      order: "desc"
    };

    const result = await transactionService.getAllTransactions(query);

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    return next(error);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.transactionIdParam);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Transaction fetched successfully",
      data: transaction
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById
};
