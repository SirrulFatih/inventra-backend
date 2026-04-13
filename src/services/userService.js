const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const {
  MIN_PASSWORD_LENGTH,
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeRole
} = require("../utils/validators");

const SALT_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  role: {
    select: {
      name: true
    }
  }
};

const mapUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    createdAt: user.createdAt
  };
};

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const getRoleByName = async (roleName) => {
  const normalizedRoleName = normalizeRole(roleName);

  if (!isNonEmptyString(normalizedRoleName)) {
    throw new AppError("Role cannot be empty", 400);
  }

  const role = await prisma.role.findUnique({
    where: { name: normalizedRoleName },
    select: { id: true, name: true }
  });

  if (!role) {
    throw new AppError(`Role '${normalizedRoleName}' does not exist`, 400);
  }

  return role;
};

const getRoleById = async (roleId) => {
  const parsedRoleId = parsePositiveInt(roleId, "roleId");

  const role = await prisma.role.findUnique({
    where: { id: parsedRoleId },
    select: { id: true, name: true }
  });

  if (!role) {
    throw new AppError("Role not found", 400);
  }

  return role;
};

const createUser = async ({ name, email, password, roleId }) => {
  if (!isNonEmptyString(name)) {
    throw new AppError("Name cannot be empty", 400);
  }

  if (!isValidEmail(email)) {
    throw new AppError("Email must be a valid format", 400);
  }

  if (!isValidPassword(password)) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const normalizedName = name.trim();
  const normalizedEmail = normalizeEmail(email);
  const selectedRole = await getRoleById(roleId);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const createdUser = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        roleId: selectedRole.id
      },
      select: USER_SELECT
    });

    return mapUser(createdUser);
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Email is already in use", 409);
    }

    throw error;
  }
};

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: {
      createdAt: "desc"
    }
  });

  return users.map(mapUser);
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return mapUser(user);
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

  if (payload.roleId !== undefined) {
    const selectedRole = await getRoleById(payload.roleId);

    updateData.roleId = selectedRole.id;
  }

  if (payload.role !== undefined) {
    const selectedRole = await getRoleByName(payload.role);

    updateData.roleId = selectedRole.id;
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
      select: USER_SELECT
    });

    return mapUser(updatedUser);
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
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
