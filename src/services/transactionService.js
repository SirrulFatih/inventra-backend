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

const INSUFFICIENT_AVAILABLE_STOCK_MESSAGE = "Insufficient available stock";
const RESERVED_STOCK_INCONSISTENT_MESSAGE = "Reserved stock is inconsistent";

const mapItemStock = (item) => {
  return {
    ...item,
    availableStock: item.stock - item.reservedStock
  };
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
      stock: true,
      reservedStock: true
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
  const { approvedByUser, item, user, ...transactionData } = transaction;

  return {
    ...transactionData,
    approvedBy: approvedByUser ? approvedByUser.name : null,
    item: item ? mapItemStock(item) : undefined,
    user: {
      ...user,
      role: user.role.name
    }
  };
};

const reserveStockForPendingOutTransaction = async (tx, { itemId, quantity }) => {
  const updateCount = await tx.$executeRaw`
    UPDATE Item
    SET reservedStock = reservedStock + ${quantity}
    WHERE id = ${itemId}
      AND (stock - reservedStock) >= ${quantity}
  `;

  return Number(updateCount);
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

  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: parsedItemId },
        select: {
          id: true,
          stock: true,
          reservedStock: true
        }
      });

      if (!item) {
        throw new AppError("Item not found", 404);
      }

      if (normalizedType === "OUT") {
        const availableStock = item.stock - item.reservedStock;

        if (availableStock < parsedQuantity) {
          throw new AppError(INSUFFICIENT_AVAILABLE_STOCK_MESSAGE, 400);
        }

        const updateCount = await reserveStockForPendingOutTransaction(tx, {
          itemId: parsedItemId,
          quantity: parsedQuantity
        });

        if (updateCount === 0) {
          throw new AppError(INSUFFICIENT_AVAILABLE_STOCK_MESSAGE, 400);
        }
      }

      const transaction = await tx.transaction.create({
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
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new AppError("Invalid transaction user", 400);
    }

    throw error;
  }
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
            },
            reservedStock: {
              gte: existingTransaction.quantity
            }
          },
          data: {
            stock: {
              decrement: existingTransaction.quantity
            },
            reservedStock: {
              decrement: existingTransaction.quantity
            }
          }
        });

        if (updateResult.count === 0) {
          const itemSnapshot = await tx.item.findUnique({
            where: { id: existingTransaction.itemId },
            select: {
              stock: true,
              reservedStock: true
            }
          });

          if (!itemSnapshot) {
            throw new AppError("Item not found", 404);
          }

          if (itemSnapshot.stock < existingTransaction.quantity) {
            throw new AppError("Insufficient stock", 400);
          }

          // Backward compatibility for old pending OUT transactions created before reservation rollout.
          if (itemSnapshot.reservedStock < existingTransaction.quantity) {
            const legacyUpdateResult = await tx.item.updateMany({
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

            if (legacyUpdateResult.count === 0) {
              throw new AppError("Insufficient stock", 400);
            }
          } else {
            throw new AppError(RESERVED_STOCK_INCONSISTENT_MESSAGE, 400);
          }
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

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: parsedTransactionId },
      select: {
        id: true,
        itemId: true,
        type: true,
        quantity: true,
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

    if (transaction.type === "OUT") {
      const itemSnapshot = await tx.item.findUnique({
        where: { id: transaction.itemId },
        select: {
          reservedStock: true
        }
      });

      if (!itemSnapshot) {
        throw new AppError("Item not found", 404);
      }

      if (itemSnapshot.reservedStock >= transaction.quantity) {
        const updateResult = await tx.item.updateMany({
          where: {
            id: transaction.itemId,
            reservedStock: {
              gte: transaction.quantity
            }
          },
          data: {
            reservedStock: {
              decrement: transaction.quantity
            }
          }
        });

        if (updateResult.count === 0) {
          throw new AppError(RESERVED_STOCK_INCONSISTENT_MESSAGE, 400);
        }
      }
    }

    const rejectedTransaction = await tx.transaction.update({
      where: { id: parsedTransactionId },
      data: {
        status: TRANSACTION_STATUS.REJECTED,
        approvedBy: null,
        approvedAt: null
      },
      select: TRANSACTION_SELECT
    });

    return mapTransaction(rejectedTransaction);
  });
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  approveTransaction,
  rejectTransaction
};
