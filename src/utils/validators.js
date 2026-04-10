const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const ALLOWED_ROLES = ["admin", "karyawan"];
const ALLOWED_TRANSACTION_TYPES = ["IN", "OUT"];
const ALLOWED_AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN"];
const ALLOWED_AUDIT_TABLE_NAMES = ["User", "Item", "Transaction"];

const isNonEmptyString = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

const normalizeEmail = (email) => {
  return String(email).trim().toLowerCase();
};

const isValidEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  return EMAIL_REGEX.test(normalizeEmail(email));
};

const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
};

const normalizeRole = (role) => {
  return String(role).trim().toLowerCase();
};

const isAllowedRole = (role) => {
  return ALLOWED_ROLES.includes(normalizeRole(role));
};

const normalizeTransactionType = (type) => {
  return String(type).trim().toUpperCase();
};

const isAllowedTransactionType = (type) => {
  return ALLOWED_TRANSACTION_TYPES.includes(normalizeTransactionType(type));
};

const normalizeAuditAction = (action) => {
  return String(action).trim().toUpperCase();
};

const isAllowedAuditAction = (action) => {
  return ALLOWED_AUDIT_ACTIONS.includes(normalizeAuditAction(action));
};

const normalizeAuditTableName = (tableName) => {
  const normalizedValue = String(tableName).trim().toLowerCase();

  if (normalizedValue === "user") {
    return "User";
  }

  if (normalizedValue === "item") {
    return "Item";
  }

  if (normalizedValue === "transaction") {
    return "Transaction";
  }

  return String(tableName).trim();
};

const isAllowedAuditTableName = (tableName) => {
  return ALLOWED_AUDIT_TABLE_NAMES.includes(normalizeAuditTableName(tableName));
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  ALLOWED_ROLES,
  ALLOWED_TRANSACTION_TYPES,
  ALLOWED_AUDIT_ACTIONS,
  ALLOWED_AUDIT_TABLE_NAMES,
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeRole,
  isAllowedRole,
  normalizeTransactionType,
  isAllowedTransactionType,
  normalizeAuditAction,
  isAllowedAuditAction,
  normalizeAuditTableName,
  isAllowedAuditTableName
};
