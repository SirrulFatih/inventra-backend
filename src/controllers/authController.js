const authService = require("../services/authService");
const auditLogService = require("../services/auditLogService");
const { sendSuccess } = require("../utils/response");

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.validatedBody || req.body);

    await auditLogService.logActionSafely({
      userId: result.user.id,
      action: "CREATE",
      tableName: "User",
      recordId: result.user.id,
      description: "User registered"
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "User registered successfully",
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.validatedBody || req.body);

    await auditLogService.logActionSafely({
      userId: result.user.id,
      action: "LOGIN",
      tableName: "User",
      recordId: result.user.id,
      description: "User login successful"
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login
};
