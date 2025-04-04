const express = require("express");
const passport = require("passport");
const router = express.Router();
const logger = require("../utils/logger");

// Google OAuth routes
router.get(
  "/google",
  (req, res, next) => {
    logger.info("Initiating Google OAuth flow", { ip: req.ip });
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    logger.info("Received Google OAuth callback", { 
      ip: req.ip,
      hasCode: Boolean(req.query.code)
    });
    next();
  },
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: process.env.CLIENT_URL || "http://localhost:3000",
  }),
  (req, res) => {
    logger.info("Google authentication successful", { userId: req.user._id });
  }
);

// GitHub OAuth routes
router.get(
  "/github",
  (req, res, next) => {
    logger.info("Initiating GitHub OAuth flow", { ip: req.ip });
    next();
  },
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  (req, res, next) => {
    logger.info("Received GitHub OAuth callback", { 
      ip: req.ip,
      hasCode: Boolean(req.query.code)
    });
    next();
  },
  passport.authenticate("github", {
    failureRedirect: "/login",
    successRedirect: process.env.CLIENT_URL || "http://localhost:3000",
  }),
  (req, res) => {
    logger.info("GitHub authentication successful", { userId: req.user._id });
  }
);

// Get current user
router.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    logger.info("Current user info requested", { userId: req.user._id });
    return res.json({
      success: true,
      user: req.user,
    });
  }
  
  logger.warn("Unauthenticated user info request", { ip: req.ip });
  res.status(401).json({
    success: false,
    message: "Not authenticated",
  });
});

// Logout
router.get("/logout", (req, res) => {
  if (req.user) {
    logger.info("User logout requested", { userId: req.user._id });
  }
  
  req.logout(function(err) {
    if (err) {
      logger.error("Error during logout", { error: err.message });
      return res.status(500).json({
        success: false,
        message: "Error during logout",
      });
    }
    logger.info("User logged out successfully");
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
  });
});

module.exports = router;