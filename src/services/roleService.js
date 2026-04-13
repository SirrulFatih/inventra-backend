const prisma = require("../prisma/client");
const { AppError } = require("../utils/appError");
const { isNonEmptyString, normalizeRole } = require("../utils/validators");

const ROLE_WITH_PERMISSIONS_SELECT = {
  id: true,
  name: true,
  rolePermissions: {
    select: {
      permission: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }
};

const mapRole = (role) => {
  const permissions = role.rolePermissions
    .map((rolePermission) => rolePermission.permission)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    id: role.id,
    name: role.name,
    permissions
  };
};

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return parsed;
};

const normalizeRoleName = (name) => {
  const normalizedName = normalizeRole(name);

  if (!isNonEmptyString(normalizedName)) {
    throw new AppError("Role name cannot be empty", 400);
  }

  return normalizedName;
};

const normalizePermissionIds = (permissionIds = []) => {
  if (!Array.isArray(permissionIds)) {
    throw new AppError("permissionIds must be an array", 400);
  }

  const normalizedIds = permissionIds.map((permissionId) => parsePositiveInt(permissionId, "permissionId"));
  return [...new Set(normalizedIds)];
};

const ensurePermissionsExist = async (tx, permissionIds) => {
  if (permissionIds.length === 0) {
    return;
  }

  const permissions = await tx.permission.findMany({
    where: {
      id: {
        in: permissionIds
      }
    },
    select: {
      id: true
    }
  });

  if (permissions.length !== permissionIds.length) {
    throw new AppError("One or more permissions do not exist", 400);
  }
};

const getAllRoles = async () => {
  const roles = await prisma.role.findMany({
    orderBy: {
      name: "asc"
    },
    select: ROLE_WITH_PERMISSIONS_SELECT
  });

  return roles.map(mapRole);
};

const getAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true
    }
  });
};

const createRole = async ({ name, permissionIds = [] }) => {
  const normalizedName = normalizeRoleName(name);
  const normalizedPermissionIds = normalizePermissionIds(permissionIds);

  try {
    return await prisma.$transaction(async (tx) => {
      await ensurePermissionsExist(tx, normalizedPermissionIds);

      const createdRole = await tx.role.create({
        data: {
          name: normalizedName,
          rolePermissions: {
            create: normalizedPermissionIds.map((permissionId) => ({
              permissionId
            }))
          }
        },
        select: ROLE_WITH_PERMISSIONS_SELECT
      });

      return mapRole(createdRole);
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Role name already exists", 409);
    }

    throw error;
  }
};

const updateRole = async (roleId, payload) => {
  const parsedRoleId = parsePositiveInt(roleId, "roleId");

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("Invalid update payload", 400);
  }

  const hasName = payload.name !== undefined;
  const hasPermissionIds = payload.permissionIds !== undefined;

  if (!hasName && !hasPermissionIds) {
    throw new AppError("No valid fields to update", 400);
  }

  const normalizedPermissionIds = hasPermissionIds ? normalizePermissionIds(payload.permissionIds) : null;

  try {
    return await prisma.$transaction(async (tx) => {
      const existingRole = await tx.role.findUnique({
        where: {
          id: parsedRoleId
        },
        select: {
          id: true
        }
      });

      if (!existingRole) {
        throw new AppError("Role not found", 404);
      }

      if (hasName) {
        const normalizedName = normalizeRoleName(payload.name);

        await tx.role.update({
          where: {
            id: parsedRoleId
          },
          data: {
            name: normalizedName
          },
          select: {
            id: true
          }
        });
      }

      if (hasPermissionIds) {
        await ensurePermissionsExist(tx, normalizedPermissionIds);

        await tx.rolePermission.deleteMany({
          where: {
            roleId: parsedRoleId
          }
        });

        if (normalizedPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: normalizedPermissionIds.map((permissionId) => ({
              roleId: parsedRoleId,
              permissionId
            }))
          });
        }
      }

      const updatedRole = await tx.role.findUnique({
        where: {
          id: parsedRoleId
        },
        select: ROLE_WITH_PERMISSIONS_SELECT
      });

      return mapRole(updatedRole);
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new AppError("Role name already exists", 409);
    }

    throw error;
  }
};

const deleteRole = async (roleId) => {
  const parsedRoleId = parsePositiveInt(roleId, "roleId");

  return prisma.$transaction(async (tx) => {
    const existingRole = await tx.role.findUnique({
      where: {
        id: parsedRoleId
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!existingRole) {
      throw new AppError("Role not found", 404);
    }

    const assignedUsersCount = await tx.user.count({
      where: {
        roleId: parsedRoleId
      }
    });

    if (assignedUsersCount > 0) {
      throw new AppError("Cannot delete role that is assigned to users", 409);
    }

    await tx.rolePermission.deleteMany({
      where: {
        roleId: parsedRoleId
      }
    });

    await tx.role.delete({
      where: {
        id: parsedRoleId
      }
    });

    return {
      id: existingRole.id,
      name: existingRole.name
    };
  });
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole
};
