const authService = require("../services/authService");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Google OAuth
exports.googleAuth = (req, res) => {
  logger.info("Initiating Google OAuth flow");
  const authUrl = authService.getGoogleAuthUrl();
  res.redirect(authUrl);
};

// Update the OAuth callback methods in your existing authController.js

// Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    logger.info("Processing Google OAuth callback");
    const { code, state } = req.query;

    // Determine if this is a login or registration
    const isRegistration =
      state === "register" || req.session.authIntent === "register";

    const userData = await authService.handleGoogleCallback(
      code,
      isRegistration
    );

    logger.info(
      `Google authentication successful for user: ${userData.user.email}`
    );

    // Ensure token is properly encoded for URL
    const token = encodeURIComponent(userData.token);
    // Redirect with token as query parameter
    const redirectUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000/auth"
    }/success?token=${token}`;
    logger.debug(`Redirecting to: ${redirectUrl}`);

    res.redirect(redirectUrl);
  } catch (error) {
    logger.error("Google OAuth callback error:", {
      error: error.message,
      stack: error.stack,
    });

    const errorMessage = encodeURIComponent(error.message);
    // Redirect with error message as query parameter
    res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000/auth"
      }/error?message=${errorMessage}`
    );
  }
};

// GitHub OAuth callback
exports.githubCallback = async (req, res) => {
  try {
    logger.info("Processing GitHub OAuth callback");
    const { code, state } = req.query;

    // Determine if this is a login or registration
    const isRegistration =
      state === "register" || req.session.authIntent === "register";

    const userData = await authService.handleGithubCallback(
      code,
      isRegistration
    );

    logger.info(
      `GitHub authentication successful for user: ${userData.user.email}`
    );

    // Ensure token is properly encoded for URL
    const token = encodeURIComponent(userData.token);
    // Redirect with token as query parameter
    const redirectUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000/auth"
    }/success?token=${token}`;
    logger.debug(`Redirecting to: ${redirectUrl}`);

    res.redirect(redirectUrl);
  } catch (error) {
    logger.error("GitHub OAuth callback error:", {
      error: error.message,
      stack: error.stack,
    });

    const errorMessage = encodeURIComponent(error.message);
    // Redirect with error message as query parameter
    res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000/auth"
      }/error?message=${errorMessage}`
    );
  }
};

// Local authentication
exports.register = async (req, res) => {
  try {
    logger.info("Processing user registration");
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      logger.warn("Registration failed: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password",
      });
    }

    const userData = await authService.registerUser(name, email, password);

    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for verification.",
    });
  } catch (error) {
    logger.error("Registration error:", {
      error: error.message,
      stack: error.stack,
    });

    // Handle duplicate email error
    if (error.message.includes("duplicate")) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

exports.login = async (req, res) => {
  try {
    logger.info("Processing user login");
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Login failed: Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const userData = await authService.loginUser(email, password);

    logger.info(`User logged in successfully: ${email}`);
    res.json({
      success: true,
      token: userData.token,
      user: {
        id: userData.user._id,
        name: userData.user.name,
        email: userData.user.email,
        picture: userData.user.picture,
        isAdmin: userData.user.isAdmin,
      },
    });
  } catch (error) {
    logger.error("Login error:", {
      error: error.message,
      stack: error.stack,
    });

    // Handle authentication errors
    if (
      error.message.includes("Invalid credentials") ||
      error.message.includes("not verified")
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    logger.info("Processing email verification");
    const { token } = req.params;

    await authService.verifyEmail(token);

    logger.info("Email verified successfully");
    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:3000/auth"}/verified`
    );
  } catch (error) {
    logger.error("Email verification error:", {
      error: error.message,
      stack: error.stack,
    });
    res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000/auth"
      }/error?message=Invalid or expired verification token`
    );
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    logger.info("Processing forgot password request");
    const { email } = req.body;

    if (!email) {
      logger.warn("Forgot password failed: Missing email");
      return res.status(400).json({
        success: false,
        message: "Please provide your email address",
      });
    }

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message:
        "If your email is registered, you will receive a password reset link",
    });
  } catch (error) {
    logger.error("Forgot password error:", {
      error: error.message,
      stack: error.stack,
    });

    // Still return success to prevent email enumeration
    res.json({
      success: true,
      message:
        "If your email is registered, you will receive a password reset link",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    logger.info("Processing password reset");
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      logger.warn("Password reset failed: Missing password");
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    await authService.resetPassword(token, password);

    logger.info("Password reset successful");
    res.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    logger.error("Password reset error:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    logger.info("Getting current user information");
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("No token provided for user info request");
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      logger.warn("User not found for token");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    logger.info(`Current user info retrieved for: ${user.email}`);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logger.error("Get current user error:", {
      error: error.message,
      stack: error.stack,
    });

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Logout - for JWT we just need to tell client to remove the token
exports.logout = (req, res) => {
  logger.info("User logout");
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// Add these middleware functions to your existing authController.js

// Check if email is not already used by an OAuth account
exports.checkEmailNotOAuth = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    logger.debug("Checking if email is used by OAuth account", { email });
    const user = await User.findOne({ email });

    if (user && user.provider !== "local") {
      logger.warn("Registration attempt with OAuth email", {
        email,
        provider: user.provider,
      });
      return res.status(400).json({
        success: false,
        message: `This email is already registered with ${user.provider}. Please sign in with ${user.provider}.`,
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
      message: "Server error",
    });
  }
};

// Check if user is a local user (not OAuth)
exports.checkLocalUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    logger.debug("Checking if user is local", { email });
    const user = await User.findOne({ email });

    if (!user) {
      // Let the login handler deal with non-existent users
      return next();
    }

    if (user.provider !== "local") {
      logger.warn("Local login attempt for OAuth user", {
        email,
        provider: user.provider,
      });
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`,
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
      message: "Server error",
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
        message: "Password is required",
      });
    }

    logger.info("OAuth user setting password", { userId });

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      logger.warn("User not found when setting password", { userId });
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    await user.save();

    logger.info("Password set successfully for OAuth user", { userId });
    res.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    logger.error("Error setting password for OAuth user:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
