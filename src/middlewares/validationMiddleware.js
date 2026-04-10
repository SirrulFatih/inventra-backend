const { AppError } = require("../utils/appError");
const {
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
} = require("../utils/validators");

const ensureJsonObjectBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Request body must be a JSON object", 400);
  }
};

const parsePositiveIntParam = (value, fieldLabel) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${fieldLabel} id`, 400);
  }

  return parsed;
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

const parseStock = (stock) => {
  const parsedStock = Number(stock);

  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    throw new AppError("Stock must be a number greater than or equal to 0", 400);
  }

  return parsedStock;
};

const validateRegisterPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const { name, email, password } = req.body;

    if (!isNonEmptyString(name)) {
      throw new AppError("Name cannot be empty", 400);
    }

    if (!isValidEmail(email)) {
      throw new AppError("Email must be a valid format", 400);
    }

    if (!isValidPassword(password)) {
      throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
    }

    req.validatedBody = {
      name: name.trim(),
      email: normalizeEmail(email),
      password
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateLoginPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      throw new AppError("Email must be a valid format", 400);
    }

    if (!isValidPassword(password)) {
      throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
    }

    req.validatedBody = {
      email: normalizeEmail(email),
      password
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateUserIdParam = (req, res, next) => {
  try {
    const userId = parsePositiveIntParam(req.params.id, "user");
    req.userIdParam = userId;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateItemIdParam = (req, res, next) => {
  try {
    const itemId = parsePositiveIntParam(req.params.id, "item");
    req.itemIdParam = itemId;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateCreateItemPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const payload = req.body;
    const payloadKeys = Object.keys(payload);
    const allowedFields = ["name", "stock", "description"];
    const invalidFields = payloadKeys.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new AppError(`Invalid item fields: ${invalidFields.join(", ")}`, 400);
    }

    if (!isNonEmptyString(payload.name)) {
      throw new AppError("Name is required", 400);
    }

    const sanitizedPayload = {
      name: payload.name.trim(),
      stock: payload.stock === undefined ? 0 : parseStock(payload.stock)
    };

    const sanitizedDescription = sanitizeDescription(payload.description);
    if (sanitizedDescription !== undefined) {
      sanitizedPayload.description = sanitizedDescription;
    }

    req.validatedBody = sanitizedPayload;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateItemListQuery = (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const rawSearch = req.query.search;

    const page = rawPage === undefined ? 1 : Number(rawPage);
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);

    if (!Number.isInteger(page) || page <= 0) {
      throw new AppError("Page must be a positive integer", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new AppError("Limit must be a positive integer", 400);
    }

    if (limit > 100) {
      throw new AppError("Limit cannot be greater than 100", 400);
    }

    let search;
    if (rawSearch !== undefined) {
      if (typeof rawSearch !== "string") {
        throw new AppError("Search must be a string", 400);
      }

      const trimmedSearch = rawSearch.trim();
      if (trimmedSearch.length > 100) {
        throw new AppError("Search cannot exceed 100 characters", 400);
      }

      search = trimmedSearch.length > 0 ? trimmedSearch : undefined;
    }

    req.validatedQuery = {
      page,
      limit,
      search
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateUpdateItemPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const payload = req.body;
    const payloadKeys = Object.keys(payload);
    const allowedFields = ["name", "stock", "description"];

    if (payloadKeys.length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const invalidFields = payloadKeys.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new AppError(`Invalid update fields: ${invalidFields.join(", ")}`, 400);
    }

    const sanitizedPayload = {};

    if (payload.name !== undefined) {
      if (!isNonEmptyString(payload.name)) {
        throw new AppError("Name is required", 400);
      }

      sanitizedPayload.name = payload.name.trim();
    }

    if (payload.stock !== undefined) {
      sanitizedPayload.stock = parseStock(payload.stock);
    }

    if (payload.description !== undefined) {
      sanitizedPayload.description = sanitizeDescription(payload.description);
    }

    if (Object.keys(sanitizedPayload).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    req.validatedBody = sanitizedPayload;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateCreateTransactionPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const payload = req.body;
    const payloadKeys = Object.keys(payload);
    const allowedFields = ["itemId", "type", "quantity"];
    const invalidFields = payloadKeys.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new AppError(`Invalid transaction fields: ${invalidFields.join(", ")}`, 400);
    }

    if (payload.itemId === undefined) {
      throw new AppError("itemId is required", 400);
    }

    if (payload.type === undefined) {
      throw new AppError("Type is required", 400);
    }

    if (payload.quantity === undefined) {
      throw new AppError("Quantity is required", 400);
    }

    const itemId = parsePositiveIntParam(payload.itemId, "item");
    const quantity = Number(payload.quantity);
    const normalizedType = normalizeTransactionType(payload.type);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError("Quantity must be a positive integer", 400);
    }

    if (!isAllowedTransactionType(normalizedType)) {
      throw new AppError(`Type must be one of: ${ALLOWED_TRANSACTION_TYPES.join(", ")}`, 400);
    }

    req.validatedBody = {
      itemId,
      type: normalizedType,
      quantity
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateTransactionIdParam = (req, res, next) => {
  try {
    const transactionId = parsePositiveIntParam(req.params.id, "transaction");
    req.transactionIdParam = transactionId;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateTransactionListQuery = (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const rawItemId = req.query.itemId;
    const rawType = req.query.type;
    const rawSortBy = req.query.sortBy;
    const rawOrder = req.query.order;

    const page = rawPage === undefined ? 1 : Number(rawPage);
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);

    if (!Number.isInteger(page) || page <= 0) {
      throw new AppError("Page must be a positive integer", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new AppError("Limit must be a positive integer", 400);
    }

    if (limit > 100) {
      throw new AppError("Limit cannot be greater than 100", 400);
    }

    let itemId;
    if (rawItemId !== undefined) {
      itemId = parsePositiveIntParam(rawItemId, "item");
    }

    let type;
    if (rawType !== undefined) {
      const normalizedType = normalizeTransactionType(rawType);

      if (!isAllowedTransactionType(normalizedType)) {
        throw new AppError(`Type must be one of: ${ALLOWED_TRANSACTION_TYPES.join(", ")}`, 400);
      }

      type = normalizedType;
    }

    const allowedSortBy = ["createdAt", "quantity"];
    const allowedOrder = ["asc", "desc"];

    let sortBy = "createdAt";
    if (rawSortBy !== undefined) {
      if (typeof rawSortBy !== "string") {
        throw new AppError("sortBy must be a string", 400);
      }

      const normalizedSortBy = rawSortBy.trim();
      if (!allowedSortBy.includes(normalizedSortBy)) {
        throw new AppError(`sortBy must be one of: ${allowedSortBy.join(", ")}`, 400);
      }

      sortBy = normalizedSortBy;
    }

    let order = "desc";
    if (rawOrder !== undefined) {
      if (typeof rawOrder !== "string") {
        throw new AppError("order must be a string", 400);
      }

      const normalizedOrder = rawOrder.trim().toLowerCase();
      if (!allowedOrder.includes(normalizedOrder)) {
        throw new AppError(`order must be one of: ${allowedOrder.join(", ")}`, 400);
      }

      order = normalizedOrder;
    }

    req.validatedQuery = {
      page,
      limit,
      itemId,
      type,
      sortBy,
      order
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateUpdateUserPayload = (req, res, next) => {
  try {
    ensureJsonObjectBody(req.body);

    const payload = req.body;
    const payloadKeys = Object.keys(payload);
    const allowedFields = ["name", "email", "password", "role"];

    if (payloadKeys.length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const invalidFields = payloadKeys.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new AppError(`Invalid update fields: ${invalidFields.join(", ")}`, 400);
    }

    const sanitizedPayload = {};

    if (payload.name !== undefined) {
      if (!isNonEmptyString(payload.name)) {
        throw new AppError("Name cannot be empty", 400);
      }

      sanitizedPayload.name = payload.name.trim();
    }

    if (payload.email !== undefined) {
      if (!isValidEmail(payload.email)) {
        throw new AppError("Email must be a valid format", 400);
      }

      sanitizedPayload.email = normalizeEmail(payload.email);
    }

    if (payload.password !== undefined) {
      if (!isValidPassword(payload.password)) {
        throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
      }

      sanitizedPayload.password = payload.password;
    }

    if (payload.role !== undefined) {
      if (!isAllowedRole(payload.role)) {
        throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
      }

      sanitizedPayload.role = normalizeRole(payload.role);
    }

    if (Object.keys(sanitizedPayload).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    req.validatedBody = sanitizedPayload;

    return next();
  } catch (error) {
    return next(error);
  }
};

const validateAuditLogListQuery = (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const rawUserId = req.query.userId;
    const rawAction = req.query.action;
    const rawTableName = req.query.tableName;

    const page = rawPage === undefined ? 1 : Number(rawPage);
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);

    if (!Number.isInteger(page) || page <= 0) {
      throw new AppError("Page must be a positive integer", 400);
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new AppError("Limit must be a positive integer", 400);
    }

    if (limit > 100) {
      throw new AppError("Limit cannot be greater than 100", 400);
    }

    let userId;
    if (rawUserId !== undefined) {
      userId = parsePositiveIntParam(rawUserId, "user");
    }

    let action;
    if (rawAction !== undefined) {
      const normalizedAction = normalizeAuditAction(rawAction);

      if (!isAllowedAuditAction(normalizedAction)) {
        throw new AppError(`action must be one of: ${ALLOWED_AUDIT_ACTIONS.join(", ")}`, 400);
      }

      action = normalizedAction;
    }

    let tableName;
    if (rawTableName !== undefined) {
      const normalizedTableName = normalizeAuditTableName(rawTableName);

      if (!isAllowedAuditTableName(normalizedTableName)) {
        throw new AppError(`tableName must be one of: ${ALLOWED_AUDIT_TABLE_NAMES.join(", ")}`, 400);
      }

      tableName = normalizedTableName;
    }

    req.validatedQuery = {
      page,
      limit,
      userId,
      action,
      tableName
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateUserIdParam,
  validateUpdateUserPayload,
  validateItemIdParam,
  validateItemListQuery,
  validateCreateItemPayload,
  validateUpdateItemPayload,
  validateCreateTransactionPayload,
  validateTransactionIdParam,
  validateTransactionListQuery,
  validateAuditLogListQuery
};
