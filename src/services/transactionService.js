const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const {
  normalizeTransactionType,
  isAllowedTransactionType,
  normalizeTransactionStatus,
  isAllowedTransactionStatus
} = require("../utils/validators");

const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
};

const TRANSACTION_SELECT = {
  id: true,
  itemId: true,
  type: true,
  quantity: true,
  userId: true,
  status: true,
  approvedAt: true,
  createdAt: true,
  item: {
    select: {
      id: true,
      name: true,
      stock: true
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      role: {
        select: {
          name: true
        }
      }
    }
  },
  approvedByUser: {
    select: {
      id: true,
      name: true
    }
  }
};

const mapTransaction = (transaction) => {
  const { approvedByUser, user, ...transactionData } = transaction;

  return {
    ...transactionData,
    approvedBy: approvedByUser ? approvedByUser.name : null,
    user: {
      ...user,
      role: user.role.name
    }
  };
};

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const createTransaction = async ({ itemId, type, quantity, userId }) => {
  const parsedItemId = parsePositiveInt(itemId, "itemId");
  const parsedQuantity = parsePositiveInt(quantity, "quantity");
  const parsedUserId = parsePositiveInt(userId, "userId");
  const normalizedType = normalizeTransactionType(type);

  if (!isAllowedTransactionType(normalizedType)) {
    throw new AppError("Type must be IN or OUT", 400);
  }

  const item = await prisma.item.findUnique({
    where: { id: parsedItemId },
    select: { id: true }
  });

  if (!item) {
    throw new AppError("Item not found", 404);
  }

  const transaction = await prisma.transaction.create({
    data: {
      itemId: parsedItemId,
      type: normalizedType,
      quantity: parsedQuantity,
      userId: parsedUserId,
      status: TRANSACTION_STATUS.PENDING
    },
    select: TRANSACTION_SELECT
  });

  return mapTransaction(transaction);
};

const getAllTransactions = async ({ page = 1, limit = 10, itemId, type, status, sortBy = "createdAt", order = "desc" } = {}) => {
  const where = {};

  if (itemId !== undefined) {
    where.itemId = parsePositiveInt(itemId, "itemId");
  }

  if (type !== undefined) {
    const normalizedType = normalizeTransactionType(type);

    if (!isAllowedTransactionType(normalizedType)) {
      throw new AppError("Type must be IN or OUT", 400);
    }

    where.type = normalizedType;
  }

  if (status !== undefined) {
    const normalizedStatus = normalizeTransactionStatus(status);

    if (!isAllowedTransactionStatus(normalizedStatus)) {
      throw new AppError("status must be PENDING, APPROVED, or REJECTED", 400);
    }

    where.status = normalizedStatus;
  }

  const allowedSortBy = ["createdAt", "quantity"];
  const allowedOrder = ["asc", "desc"];

  if (!allowedSortBy.includes(sortBy)) {
    throw new AppError("sortBy must be createdAt or quantity", 400);
  }

  if (!allowedOrder.includes(order)) {
    throw new AppError("order must be asc or desc", 400);
  }

  const skip = (page - 1) * limit;
  const take = limit;
  const finalWhere = Object.keys(where).length > 0 ? where : undefined;
  const orderBy = [{ [sortBy]: order }, { id: "desc" }];

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: finalWhere,
      skip,
      take,
      select: TRANSACTION_SELECT,
      orderBy
    }),
    prisma.transaction.count({
      where: finalWhere
    })
  ]);

  return {
    data: transactions.map(mapTransaction),
    total,
    page,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
};

const getTransactionById = async (transactionId) => {
  const parsedTransactionId = parsePositiveInt(transactionId, "transactionId");

  const transaction = await prisma.transaction.findUnique({
    where: { id: parsedTransactionId },
    select: TRANSACTION_SELECT
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return mapTransaction(transaction);
};

const approveTransaction = async (transactionId, approverUserId) => {
  const parsedTransactionId = parsePositiveInt(transactionId, "transactionId");
  const parsedApproverUserId = parsePositiveInt(approverUserId, "approverUserId");

  try {
    return await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findUnique({
        where: { id: parsedTransactionId },
        select: {
          id: true,
          itemId: true,
          type: true,
          quantity: true,
          status: true
        }
      });

      if (!existingTransaction) {
        throw new AppError("Transaction not found", 404);
      }

      if (existingTransaction.status === TRANSACTION_STATUS.APPROVED) {
        throw new AppError("Transaction is already approved", 400);
      }

      if (existingTransaction.status === TRANSACTION_STATUS.REJECTED) {
        throw new AppError("Rejected transaction cannot be approved", 400);
      }

      if (existingTransaction.type === "IN") {
        await tx.item.update({
          where: { id: existingTransaction.itemId },
          data: {
            stock: {
              increment: existingTransaction.quantity
            }
          }
        });
      } else {
        const updateResult = await tx.item.updateMany({
          where: {
            id: existingTransaction.itemId,
            stock: {
              gte: existingTransaction.quantity
            }
          },
          data: {
            stock: {
              decrement: existingTransaction.quantity
            }
          }
        });

        if (updateResult.count === 0) {
          throw new AppError("Insufficient stock", 400);
        }
      }

      const approvedTransaction = await tx.transaction.update({
        where: { id: parsedTransactionId },
        data: {
          status: TRANSACTION_STATUS.APPROVED,
          approvedBy: parsedApproverUserId,
          approvedAt: new Date()
        },
        select: TRANSACTION_SELECT
      });

      return mapTransaction(approvedTransaction);
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new AppError("Invalid approver user", 400);
    }

    throw error;
  }
};

const rejectTransaction = async (transactionId) => {
  const parsedTransactionId = parsePositiveInt(transactionId, "transactionId");

  const transaction = await prisma.transaction.findUnique({
    where: { id: parsedTransactionId },
    select: {
      id: true,
      status: true
    }
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  if (transaction.status === TRANSACTION_STATUS.REJECTED) {
    throw new AppError("Transaction is already rejected", 400);
  }

  if (transaction.status === TRANSACTION_STATUS.APPROVED) {
    throw new AppError("Approved transaction cannot be rejected", 400);
  }

  const rejectedTransaction = await prisma.transaction.update({
    where: { id: parsedTransactionId },
    data: {
      status: TRANSACTION_STATUS.REJECTED,
      approvedBy: null,
      approvedAt: null
    },
    select: TRANSACTION_SELECT
  });

  return mapTransaction(rejectedTransaction);
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  approveTransaction,
  rejectTransaction
};
