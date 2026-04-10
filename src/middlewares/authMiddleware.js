const jwt = require("jsonwebtoken");

const { AppError } = require("../utils/appError");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new AppError("JWT secret is not configured", 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token", 401));
    }

    return next(error);
  }
};

module.exports = { authMiddleware };
