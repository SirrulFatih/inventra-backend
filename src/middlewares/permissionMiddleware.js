const { AppError } = require("../utils/appError");
const { getUserPermissions } = require("../services/authorizationService");

const checkPermission = (permissionName) => {
  if (typeof permissionName !== "string" || permissionName.trim().length === 0) {
    throw new AppError("Permission name is required", 500);
  }

  const normalizedPermission = permissionName.trim();

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new AppError("Unauthorized", 401);
      }

      const permissions = await getUserPermissions(req.user.id);
      req.user.permissions = permissions;

      if (!permissions.includes(normalizedPermission)) {
        throw new AppError("Forbidden", 403);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  checkPermission
};
