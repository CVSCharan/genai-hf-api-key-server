const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`Session route accessed: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
  });
  next();
};

// Apply logging middleware to all routes
router.use(logRoute);

// Get current session info
router.get("/current", isAuthenticated, (req, res) => {
  logger.info("Getting current session info");
  res.json({
    success: true,
    session: {
      id: req.sessionID,
      user: req.user
        ? {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
          }
        : null,
      isAuthenticated: req.isAuthenticated(),
    },
  });
});

// Invalidate current session (logout)
router.delete("/current", isAuthenticated, (req, res) => {
  logger.info("Invalidating current session", { userId: req.user?._id });
  req.logout((err) => {
    if (err) {
      logger.error("Error during logout:", err);
      return res.status(500).json({
        success: false,
        message: "Error during logout",
      });
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error("Error destroying session:", err);
        return res.status(500).json({
          success: false,
          message: "Error destroying session",
        });
      }

      res.clearCookie("connect.sid");
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  });
});

module.exports = router;
