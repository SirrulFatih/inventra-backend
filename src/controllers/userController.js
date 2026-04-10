const userService = require("../services/userService");
const auditLogService = require("../services/auditLogService");
const { AppError } = require("../utils/appError");
const { sendSuccess } = require("../utils/response");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Users fetched successfully",
      data: users
    });
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const userId = req.userIdParam;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && req.user.id !== userId) {
      throw new AppError("You are not allowed to access this user", 403);
    }

    const user = await userService.getUserById(userId);

    return sendSuccess(res, {
      statusCode: 200,
      message: "User fetched successfully",
      data: user
    });
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = req.userIdParam;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && req.user.id !== userId) {
      throw new AppError("You are not allowed to update this user", 403);
    }

    const payload = req.validatedBody || req.body;

    if (!isAdmin && payload.role !== undefined) {
      throw new AppError("Only admin can update role", 403);
    }

    const updatedUser = await userService.updateUser(userId, payload);

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "User",
      recordId: updatedUser.id,
      description: `User ${updatedUser.id} updated`
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = req.userIdParam;
    await userService.deleteUser(userId);

    await auditLogService.logActionSafely({
      userId: req.user.id,
      action: "DELETE",
      tableName: "User",
      recordId: userId,
      description: `User ${userId} deleted`
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "User deleted successfully"
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
