const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const { generateToken } = require("../utils/token");
const {
  MIN_PASSWORD_LENGTH,
  isNonEmptyString,
  normalizeEmail,
  normalizeRole,
  isValidEmail,
  isValidPassword
} = require("../utils/validators");

const SALT_ROUNDS = 12;
const DEFAULT_REGISTER_ROLE = "staff";

const ROLE_WITH_PERMISSIONS_SELECT = {
  name: true,
  rolePermissions: {
    select: {
      permission: {
        select: {
          name: true
        }
      }
    }
  }
};

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  role: {
    select: ROLE_WITH_PERMISSIONS_SELECT
  }
};

const LOGIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  password: true,
  createdAt: true,
  role: {
    select: ROLE_WITH_PERMISSIONS_SELECT
  }
};

const mapPermissions = (rolePermissions = []) => {
  return rolePermissions.map((rolePermission) => rolePermission.permission.name);
};

const toSafeUser = (user, { includePermissions = false } = {}) => {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    createdAt: user.createdAt
  };

  if (includePermissions) {
    safeUser.permissions = mapPermissions(user.role.rolePermissions);
  }

  return safeUser;
};

const getRoleByName = async (roleName, { useServerError = false } = {}) => {
  const normalizedRoleName = normalizeRole(roleName);

  if (!isNonEmptyString(normalizedRoleName)) {
    throw new AppError("Role cannot be empty", 400);
  }

  const role = await prisma.role.findUnique({
    where: { name: normalizedRoleName },
    select: { id: true, name: true }
  });

  if (!role) {
    const statusCode = useServerError ? 500 : 400;
    const errorMessage = useServerError
      ? `Default role '${normalizedRoleName}' is not configured`
      : `Role '${normalizedRoleName}' does not exist`;

    throw new AppError(errorMessage, statusCode);
  }

  return role;
};

const register = async ({ name, email, password }) => {
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

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const defaultRole = await getRoleByName(DEFAULT_REGISTER_ROLE, { useServerError: true });

  let user;

  try {
    user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        roleId: defaultRole.id
      },
      select: USER_SELECT
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Email is already registered", 409);
    }

    throw error;
  }

  const token = generateToken({ id: user.id, role: user.role.name });

  return {
    user: toSafeUser(user),
    token
  };
};

const login = async ({ email, password }) => {
  if (!isValidEmail(email)) {
    throw new AppError("Email must be a valid format", 400);
  }

  if (!isValidPassword(password)) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: LOGIN_USER_SELECT
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({ id: user.id, role: user.role.name });

  return {
    user: toSafeUser(user, { includePermissions: true }),
    token
  };
};

module.exports = {
  register,
  login
};
