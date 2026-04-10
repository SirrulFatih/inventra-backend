const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const { normalizeTransactionType, isAllowedTransactionType } = require("../utils/validators");

const TRANSACTION_SELECT = {
  id: true,
  itemId: true,
  type: true,
  quantity: true,
  userId: true,
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
      role: true
    }
  }
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

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({
      where: { id: parsedItemId },
      select: {
        id: true,
        stock: true
      }
    });

    if (!item) {
      throw new AppError("Item not found", 404);
    }

    if (normalizedType === "IN") {
      await tx.item.update({
        where: { id: parsedItemId },
        data: {
          stock: {
            increment: parsedQuantity
          }
        }
      });
    } else {
      const updateResult = await tx.item.updateMany({
        where: {
          id: parsedItemId,
          stock: {
            gte: parsedQuantity
          }
        },
        data: {
          stock: {
            decrement: parsedQuantity
          }
        }
      });

      if (updateResult.count === 0) {
        throw new AppError("Insufficient stock", 400);
      }
    }

    return tx.transaction.create({
      data: {
        itemId: parsedItemId,
        type: normalizedType,
        quantity: parsedQuantity,
        userId: parsedUserId
      },
      select: TRANSACTION_SELECT
    });
  });
};

const getAllTransactions = async ({ page = 1, limit = 10, itemId, type, sortBy = "createdAt", order = "desc" } = {}) => {
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
    data: transactions,
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

  return transaction;
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById
};
