const registerService = require("../services/registerService");
const User = require("../models/User");
const logger = require("../utils/logger");

// Check if email is not already used by an OAuth account
exports.checkEmailNotOAuth = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    logger.debug("Checking if email is used by OAuth account", { email });
    const user = await User.findOne({ email });
    
    if (user && user.provider !== "local") {
      logger.warn("Registration attempt with OAuth email", { email, provider: user.provider });
      return res.status(400).json({
        success: false,
        message: `This email is already registered with ${user.provider}. Please sign in with ${user.provider}.`
      });
    }
    
    next();
  } catch (error) {
    logger.error("Error checking email for OAuth:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Local registration
exports.registerLocal = async (req, res) => {
  try {
    logger.info("Processing user registration");
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      logger.warn("Registration failed: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password"
      });
    }
    
    await registerService.registerUser(name, email, password);
    
    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification."
    });
  } catch (error) {
    logger.error("Registration error:", {
      error: error.message,
      stack: error.stack,
    });
    
    // Handle duplicate email error
    if (error.message.includes("duplicate") || error.message.includes("already in use")) {
      return res.status(400).json({
        success: false,
        message: "Email already in use"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
};

// Google registration
exports.googleRegister = (req, res) => {
  logger.info("Initiating Google registration flow");
  req.session.authIntent = "register";
  const authUrl = registerService.getGoogleAuthUrl();
  res.redirect(authUrl);
};

// GitHub registration
exports.githubRegister = (req, res) => {
  logger.info("Initiating GitHub registration flow");
  req.session.authIntent = "register";
  const authUrl = registerService.getGithubAuthUrl();
  res.redirect(authUrl);
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    logger.info("Processing email verification");
    const { token } = req.params;
    
    await registerService.verifyEmail(token);
    
    logger.info("Email verified successfully");
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth/verified`);
  } catch (error) {
    logger.error("Email verification error:", {
      error: error.message,
      stack: error.stack,
    });
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/auth/error?message=Invalid or expired verification token`);
  }
};