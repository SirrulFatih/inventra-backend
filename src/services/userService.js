const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const {
  MIN_PASSWORD_LENGTH,
  ALLOWED_ROLES,
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeRole,
  isAllowedRole
} = require("../utils/validators");

const SALT_ROUNDS = 12;

const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const updateUser = async (userId, payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("Invalid update payload", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  const updateData = {};

  if (payload.name !== undefined) {
    if (!isNonEmptyString(payload.name)) {
      throw new AppError("Name cannot be empty", 400);
    }

    updateData.name = payload.name.trim();
  }

  if (payload.email !== undefined) {
    if (!isValidEmail(payload.email)) {
      throw new AppError("Email must be a valid format", 400);
    }

    updateData.email = normalizeEmail(payload.email);
  }

  if (payload.role !== undefined) {
    if (!isAllowedRole(payload.role)) {
      throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
    }

    updateData.role = normalizeRole(payload.role);
  }

  if (payload.password !== undefined) {
    if (!isValidPassword(payload.password)) {
      throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
    }

    updateData.password = await bcrypt.hash(payload.password, SALT_ROUNDS);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("No valid fields to update", 400);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return updatedUser;
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Email is already in use", 409);
    }

    throw error;
  }
};

const deleteUser = async (userId) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new AppError("Cannot delete user with related records", 409);
    }

    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
