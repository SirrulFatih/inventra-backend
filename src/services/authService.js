const bcrypt = require("bcrypt");

const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const { generateToken } = require("../utils/token");
const {
  MIN_PASSWORD_LENGTH,
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  isValidPassword
} = require("../utils/validators");

const SALT_ROUNDS = 12;

const toSafeUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
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

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword
    }
  });

  const token = generateToken({ id: user.id, role: user.role });

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
    where: { email: normalizedEmail }
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({ id: user.id, role: user.role });

  return {
    user: toSafeUser(user),
    token
  };
};

module.exports = {
  register,
  login
};
