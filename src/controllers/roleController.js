const roleService = require("../services/roleService");
const { sendSuccess } = require("../utils/response");

const getAllRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Roles fetched successfully",
      data: roles
    });
  } catch (error) {
    return next(error);
  }
};

const getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.getAllPermissions();

    return sendSuccess(res, {
      statusCode: 200,
      message: "Permissions fetched successfully",
      data: permissions
    });
  } catch (error) {
    return next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const payload = req.validatedBody || req.body;
    const role = await roleService.createRole(payload);

    return sendSuccess(res, {
      statusCode: 201,
      message: "Role created successfully",
      data: role
    });
  } catch (error) {
    return next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const payload = req.validatedBody || req.body;
    const role = await roleService.updateRole(req.roleIdParam, payload);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Role updated successfully",
      data: role
    });
  } catch (error) {
    return next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const deletedRole = await roleService.deleteRole(req.roleIdParam);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Role deleted successfully",
      data: deletedRole
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole
};
