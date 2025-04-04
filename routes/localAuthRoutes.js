const express = require("express");
const router = express.Router();
const localAuthController = require("../controllers/localAuthController");
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

module.exports = router;