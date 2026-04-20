const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const { isNonEmptyString } = require("../utils/validators");

const ITEM_SELECT = {
  id: true,
  name: true,
  stock: true,
  reservedStock: true,
  description: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true
};

const mapItem = (item) => {
  return {
    ...item,
    availableStock: item.stock - item.reservedStock
  };
};

const parseStock = (stock) => {
  const parsedStock = Number(stock);

  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    throw new AppError("Stock must be a number greater than or equal to 0", 400);
  }

  return parsedStock;
};

const sanitizeDescription = (description) => {
  if (description === undefined) {
    return undefined;
  }

  if (description === null) {
    return null;
  }

  if (typeof description !== "string") {
    throw new AppError("Description must be a string", 400);
  }

  const trimmedDescription = description.trim();
  return trimmedDescription.length > 0 ? trimmedDescription : null;
};

const assertItemExists = async (itemId, select = { id: true }) => {
  const existingItem = await prisma.item.findUnique({
    where: { id: itemId },
    select
  });

  if (!existingItem) {
    throw new AppError("Item not found", 404);
  }

  return existingItem;
};

const createItem = async ({ name, stock = 0, description, createdBy }) => {
  if (!isNonEmptyString(name)) {
    throw new AppError("Name is required", 400);
  }

  const creatorId = Number(createdBy);
  if (!Number.isInteger(creatorId) || creatorId <= 0) {
    throw new AppError("Invalid creator id", 400);
  }

  const parsedStock = parseStock(stock);
  const sanitizedDescription = sanitizeDescription(description);

  try {
    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        stock: parsedStock,
        description: sanitizedDescription,
        createdBy: creatorId
      },
      select: ITEM_SELECT
    });

    return mapItem(item);
  } catch (error) {
    if (error.code === "P2003") {
      throw new AppError("Invalid creator user", 400);
    }

    throw error;
  }
};

const getAllItems = async ({ page = 1, limit = 10, search } = {}) => {
  const where = search
    ? {
        name: {
          contains: search
        }
      }
    : undefined;

  const skip = (page - 1) * limit;
  const take = limit;

  const [items, total] = await prisma.$transaction([
    prisma.item.findMany({
      where,
      skip,
      take,
      select: ITEM_SELECT,
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.item.count({ where })
  ]);

  return {
    data: items.map(mapItem),
    total,
    page,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
};

const getItemById = async (itemId) => {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: ITEM_SELECT
  });

  if (!item) {
    throw new AppError("Item not found", 404);
  }

  return mapItem(item);
};

const updateItem = async (itemId, payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("Invalid update payload", 400);
  }

  const payloadKeys = Object.keys(payload);
  const allowedFields = ["name", "stock", "description"];

  if (payloadKeys.length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  const invalidFields = payloadKeys.filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    throw new AppError(`Invalid update fields: ${invalidFields.join(", ")}`, 400);
  }

  const updateData = {};

  if (payload.name !== undefined) {
    if (!isNonEmptyString(payload.name)) {
      throw new AppError("Name is required", 400);
    }

    updateData.name = payload.name.trim();
  }

  if (payload.stock !== undefined) {
    updateData.stock = parseStock(payload.stock);
  }

  if (payload.description !== undefined) {
    updateData.description = sanitizeDescription(payload.description);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  const existingItem = await assertItemExists(itemId, {
    id: true,
    reservedStock: true
  });

  if (updateData.stock !== undefined && updateData.stock < existingItem.reservedStock) {
    throw new AppError("Stock cannot be less than reserved stock", 400);
  }

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: updateData,
    select: ITEM_SELECT
  });

  return mapItem(updatedItem);
};

const deleteItem = async (itemId) => {
  await assertItemExists(itemId);

  try {
    await prisma.item.delete({
      where: { id: itemId }
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new AppError("Cannot delete item with related transactions", 409);
    }

    throw error;
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem
};
