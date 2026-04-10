const auditLogService = require("../services/auditLogService");

const getAllAuditLogs = async (req, res, next) => {
  try {
    const query = req.validatedQuery || {
      page: 1,
      limit: 10
    };

    const result = await auditLogService.getAllAuditLogs(query);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllAuditLogs
};
