const itemService = require("../services/itemService");
const auditLogService = require("../services/auditLogService");
const { sendSuccess } = require("../utils/response");

const createItem = async (req, res, next) => {
  try {
    const payload = req.validatedBody || req.body;

    const item = await itemService.createItem({
      ...payload,
      createdBy: req.user.id
    });

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Item",
      recordId: item.id,
      description: `Item ${item.id} created`
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Item created successfully",
      data: item
    });
  } catch (error) {
    return next(error);
  }
};

const getAllItems = async (req, res, next) => {
  try {
    const query = req.validatedQuery || {
      page: 1,
      limit: 10
    };

    const result = await itemService.getAllItems(query);

    return res.status(200).json({
      success: true,
      message: "Items fetched successfully",
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    return next(error);
  }
};

const getItemById = async (req, res, next) => {
  try {
    const item = await itemService.getItemById(req.itemIdParam);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Item fetched successfully",
      data: item
    });
  } catch (error) {
    return next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const payload = req.validatedBody || req.body;
    const item = await itemService.updateItem(req.itemIdParam, payload);

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Item",
      recordId: item.id,
      description: `Item ${item.id} updated`
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Item updated successfully",
      data: item
    });
  } catch (error) {
    return next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const itemId = req.itemIdParam;
    await itemService.deleteItem(itemId);

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Item",
      recordId: itemId,
      description: `Item ${itemId} deleted`
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Item deleted successfully"
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem
};
