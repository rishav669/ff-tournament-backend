const jwt = require("jsonwebtoken");

const authMiddleware = (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. Bearer token required",
      });
    }

    const token = authHeader
      .slice(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. Bearer token required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;