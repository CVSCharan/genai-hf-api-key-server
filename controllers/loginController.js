const loginService = require("../services/loginService");
const User = require("../models/User");
const logger = require("../utils/logger");
const bcrypt = require("bcryptjs");

// Check if user is a local user (not OAuth)
exports.checkLocalUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    logger.debug("Checking if user is local", { email });
    const user = await User.findOne({ email });
    
    if (!user) {
      // Let the login handler deal with non-existent users
      return next();
    }
    
    if (user.provider !== "local") {
      logger.warn("Local login attempt for OAuth user", { email, provider: user.provider });
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`
      });
    }
    
    next();
  } catch (error) {
    logger.error("Error checking local user:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Local login
exports.loginLocal = async (req, res) => {
  try {
    logger.info("Processing local user login");
    const { email, password } = req.body;
    
    if (!email || !password) {
      logger.warn("Login failed: Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }
    
    const userData = await loginService.loginUser(email, password);
    
    logger.info(`User logged in successfully: ${email}`);
    res.json({
      success: true,
      token: userData.token,
      user: {
        id: userData.user._id,
        name: userData.user.name,
        email: userData.user.email,
        picture: userData.user.picture,
        isAdmin: userData.user.isAdmin
      }
    });
  } catch (error) {
    logger.error("Login error:", {
      error: error.message,
      stack: error.stack,
    });
    
    // Handle authentication errors
    if (error.message.includes("Invalid credentials") || 
        error.message.includes("not verified")) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
};

// Google login
exports.googleLogin = (req, res) => {
  logger.info("Initiating Google login flow");
  req.session.authIntent = "login";
  const authUrl = loginService.getGoogleAuthUrl();
  res.redirect(authUrl);
};

// GitHub login
exports.githubLogin = (req, res) => {
  logger.info("Initiating GitHub login flow");
  req.session.authIntent = "login";
  const authUrl = loginService.getGithubAuthUrl();
  res.redirect(authUrl);
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    logger.info("Processing forgot password request");
    const { email } = req.body;
    
    if (!email) {
      logger.warn("Forgot password failed: Missing email");
      return res.status(400).json({
        success: false,
        message: "Please provide your email address"
      });
    }
    
    await loginService.forgotPassword(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If your email is registered, you will receive a password reset link"
    });
  } catch (error) {
    logger.error("Forgot password error:", {
      error: error.message,
      stack: error.stack,
    });
    
    // Still return success to prevent email enumeration
    res.json({
      success: true,
      message: "If your email is registered, you will receive a password reset link"
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    logger.info("Processing password reset");
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      logger.warn("Password reset failed: Missing password");
      return res.status(400).json({
        success: false,
        message: "Please provide a new password"
      });
    }
    
    await loginService.resetPassword(token, password);
    
    logger.info("Password reset successful");
    res.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password."
    });
  } catch (error) {
    logger.error("Password reset error:", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(400).json({
      success: false,
      message: "Invalid or expired reset token"
    });
  }
};

// Allow OAuth users to set a password
exports.setPasswordForOAuthUser = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }
    
    logger.info("OAuth user setting password", { userId });
    
    await loginService.setPasswordForOAuthUser(userId, password);
    
    logger.info("Password set successfully for OAuth user", { userId });
    res.json({
      success: true,
      message: "Password set successfully"
    });
  } catch (error) {
    logger.error("Error setting password for OAuth user:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};