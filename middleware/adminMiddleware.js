const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "User authentication required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can perform this action",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Admin authorization failed",
      error: error.message,
    });
  }
};

module.exports = adminMiddleware;