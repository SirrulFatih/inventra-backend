const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const getUserPermissions = async (userId) => {
  const parsedUserId = parsePositiveInt(userId, "userId");

  const user = await prisma.user.findUnique({
    where: {
      id: parsedUserId
    },
    select: {
      id: true,
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  const permissionNames = user.role.rolePermissions.map((rolePermission) => rolePermission.permission.name);

  return [...new Set(permissionNames)];
};

module.exports = {
  getUserPermissions
};
