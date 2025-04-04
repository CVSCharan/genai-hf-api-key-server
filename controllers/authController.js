const authService = require("../services/authService");
const logger = require("../utils/logger");

// Google OAuth
exports.googleAuth = (req, res) => {
  logger.info("Initiating Google OAuth flow");
  const authUrl = authService.getGoogleAuthUrl();
  res.redirect(authUrl);
};

exports.googleCallback = async (req, res) => {
  try {
    logger.info("Processing Google OAuth callback");
    const { code } = req.query;
    const userData = await authService.handleGoogleCallback(code);
    
    logger.info(`Google authentication successful for user: ${userData.user.email}`);
    // You might want to create a JWT token here and send it to the client
    res.redirect(`http://localhost:3000/auth/success?token=${userData.token}`);
  } catch (error) {
    logger.error("Google OAuth callback error:", { error: error.message, stack: error.stack });
    res.redirect("http://localhost:3000/auth/error");
  }
};

// GitHub OAuth
exports.githubAuth = (req, res) => {
  logger.info("Initiating GitHub OAuth flow");
  const authUrl = authService.getGithubAuthUrl();
  res.redirect(authUrl);
};

exports.githubCallback = async (req, res) => {
  try {
    logger.info("Processing GitHub OAuth callback");
    const { code } = req.query;
    const userData = await authService.handleGithubCallback(code);
    
    logger.info(`GitHub authentication successful for user: ${userData.user.email}`);
    // You might want to create a JWT token here and send it to the client
    res.redirect(`http://localhost:3000/auth/success?token=${userData.token}`);
  } catch (error) {
    logger.error("GitHub OAuth callback error:", { error: error.message, stack: error.stack });
    res.redirect("http://localhost:3000/auth/error");
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    logger.info("Getting current user information");
    // This would typically use a middleware to verify the JWT token
    // and attach the user to the request object
    const user = req.user;
    
    if (!user) {
      logger.warn("Unauthenticated user attempted to access current user info");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    logger.info(`Current user info retrieved for: ${user.email}`);
    res.json({ user });
  } catch (error) {
    logger.error("Get current user error:", { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Server error" });
  }
};