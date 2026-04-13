const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const {
  ALLOWED_AUDIT_ACTIONS,
  ALLOWED_AUDIT_TABLE_NAMES,
  normalizeAuditAction,
  isAllowedAuditAction,
  normalizeAuditTableName,
  isAllowedAuditTableName
} = require("../utils/validators");

const AUDIT_LOG_SELECT = {
  id: true,
  userId: true,
  action: true,
  tableName: true,
  recordId: true,
  description: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: {
        select: {
          name: true
        }
      }
    }
  }
};

const mapAuditLog = (log) => {
  return {
    ...log,
    user: {
      ...log.user,
      role: log.user.role.name
    }
  };
};

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const sanitizeDescription = (description) => {
  if (description === undefined || description === null) {
    return null;
  }

  if (typeof description !== "string") {
    throw new AppError("description must be a string", 400);
  }

  const trimmedDescription = description.trim();
  return trimmedDescription.length > 0 ? trimmedDescription : null;
};

const logAction = async ({ userId, action, tableName, recordId, description }) => {
  const parsedUserId = parsePositiveInt(userId, "userId");
  const parsedRecordId = parsePositiveInt(recordId, "recordId");
  const normalizedAction = normalizeAuditAction(action);
  const normalizedTableName = normalizeAuditTableName(tableName);

  if (!isAllowedAuditAction(normalizedAction)) {
    throw new AppError(`action must be one of: ${ALLOWED_AUDIT_ACTIONS.join(", ")}`, 400);
  }

  if (!isAllowedAuditTableName(normalizedTableName)) {
    throw new AppError(`tableName must be one of: ${ALLOWED_AUDIT_TABLE_NAMES.join(", ")}`, 400);
  }

  const auditLog = await prisma.auditLog.create({
    data: {
      userId: parsedUserId,
      action: normalizedAction,
      tableName: normalizedTableName,
      recordId: parsedRecordId,
      description: sanitizeDescription(description)
    },
    select: AUDIT_LOG_SELECT
  });

  return mapAuditLog(auditLog);
};

const logActionSafely = async (payload) => {
  try {
    await logAction(payload);
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
};

const getAllAuditLogs = async ({ page = 1, limit = 10, userId, action, tableName } = {}) => {
  const where = {};

  if (userId !== undefined) {
    where.userId = parsePositiveInt(userId, "userId");
  }

  if (action !== undefined) {
    const normalizedAction = normalizeAuditAction(action);

    if (!isAllowedAuditAction(normalizedAction)) {
      throw new AppError(`action must be one of: ${ALLOWED_AUDIT_ACTIONS.join(", ")}`, 400);
    }

    where.action = normalizedAction;
  }

  if (tableName !== undefined) {
    const normalizedTableName = normalizeAuditTableName(tableName);

    if (!isAllowedAuditTableName(normalizedTableName)) {
      throw new AppError(`tableName must be one of: ${ALLOWED_AUDIT_TABLE_NAMES.join(", ")}`, 400);
    }

    where.tableName = normalizedTableName;
  }

  const finalWhere = Object.keys(where).length > 0 ? where : undefined;
  const skip = (page - 1) * limit;
  const take = limit;

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: finalWhere,
      skip,
      take,
      select: AUDIT_LOG_SELECT,
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.auditLog.count({
      where: finalWhere
    })
  ]);

  return {
    data: logs.map(mapAuditLog),
    total,
    page,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
};

module.exports = {
  logAction,
  logActionSafely,
  getAllAuditLogs
};
