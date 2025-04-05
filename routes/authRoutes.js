const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const loginController = require("../controllers/loginController");
const registerController = require("../controllers/registerController");
const { isAuthenticated } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`Auth route accessed: ${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
};

// Apply logging middleware to all routes
router.use(logRoute);

// Registration routes
router.post("/register", registerController.checkEmailNotOAuth, registerController.registerLocal);
router.get("/register/google", registerController.googleRegister);
router.get("/register/github", registerController.githubRegister);
router.get("/verify/:token", registerController.verifyEmail);

// Login routes
router.post("/login", loginController.checkLocalUser, loginController.loginLocal);
router.get("/login/google", loginController.googleLogin);
router.get("/login/github", loginController.githubLogin);

// OAuth callbacks
router.get("/google/callback", authController.googleCallback);
router.get("/github/callback", authController.githubCallback);

// Password management
router.post("/forgot-password", loginController.forgotPassword);
router.post("/reset-password/:token", loginController.resetPassword);
router.post("/set-password", isAuthenticated, loginController.setPasswordForOAuthUser);

// User info and logout
router.get("/me", authController.getCurrentUser);
router.get("/logout", authController.logout);

module.exports = router;
