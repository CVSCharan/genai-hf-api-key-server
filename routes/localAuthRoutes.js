const express = require("express");
const router = express.Router();
const localAuthController = require("../controllers/localAuthController");
const localStatsController = require("../controllers/localStatsController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`Local auth route accessed: ${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
};

// Register new user
router.post("/register", logRoute, localAuthController.register);

// Login user
router.post("/login", logRoute, localAuthController.login);

// Verify email
router.get("/verify/:token", logRoute, localAuthController.verifyEmail);

// Forgot password
router.post("/forgot-password", logRoute, localAuthController.forgotPassword);

// Reset password
router.post("/reset-password/:token", logRoute, localAuthController.resetPassword);

// Local auth statistics routes (admin only)
router.get("/stats/users", logRoute, isAuthenticated, isAdmin, localStatsController.getLocalUserStats);
router.get("/stats/verification", logRoute, isAuthenticated, isAdmin, localStatsController.getVerificationStats);
router.get("/stats/registrations", logRoute, isAuthenticated, isAdmin, localStatsController.getLocalRegistrationStats);
router.get("/stats/password-resets", logRoute, isAuthenticated, isAdmin, localStatsController.getPasswordResetStats);

module.exports = router;