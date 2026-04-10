const { sendError } = require("../utils/response");

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  return sendError(res, {
    statusCode,
    message: statusCode === 500 ? "Internal server error" : err.message
  });
};

module.exports = {
  notFound,
  errorHandler
};
