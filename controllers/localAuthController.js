const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const localAuthService = require("../services/localAuthService");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

// Register a new user
exports.register = async (req, res) => {
  try {
    logger.info("User registration attempt", { email: req.body.email });
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      logger.warn("Registration failed: Missing required fields", { email });
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password",
      });
    }

    // Check if user already exists
    const existingUser = await localAuthService.findUserByEmail(email);
    if (existingUser) {
      logger.warn("Registration failed: Email already in use", { email });
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await localAuthService.createUser({
      name,
      email,
      password: hashedPassword,
      provider: "local",
      verificationToken,
      isVerified: false,
    });

    // Send verification email
    // await localAuthService.sendVerificationEmail(user.email, verificationToken);

    logger.info("User registered successfully", { userId: user._id });
    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    logger.error("Registration error:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    logger.info("User login attempt", { email: req.body.email });
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      logger.warn("Login failed: Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user
    const user = await localAuthService.findUserByEmail(email);
    if (!user) {
      logger.warn("Login failed: User not found", { email });
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is using OAuth
    if (user.provider !== "local") {
      logger.warn("Login failed: User registered with OAuth", {
        email,
        provider: user.provider,
      });
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`,
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn("Login failed: Invalid password", { email });
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      logger.warn("Login failed: Email not verified", { email });
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    logger.info("User logged in successfully", { userId: user._id });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logger.error("Login error:", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    logger.info("Email verification attempt", { token: req.params.token });
    const { token } = req.params;

    const user = await localAuthService.verifyEmail(token);
    if (!user) {
      logger.warn("Email verification failed: Invalid token", { token });
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    logger.info("Email verified successfully", { userId: user._id });
    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    logger.error("Email verification error:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Request password reset
exports.forgotPassword = async (req, res) => {
  try {
    logger.info("Password reset request", { email: req.body.email });
    const { email } = req.body;

    const user = await localAuthService.findUserByEmail(email);
    if (!user || user.provider !== "local") {
      // Don't reveal if user exists for security
      logger.info("Password reset requested for non-existent or OAuth user", {
        email,
      });
      return res.json({
        success: true,
        message:
          "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = Date.now() + 3600000; // 1 hour

    await localAuthService.setResetToken(user._id, resetToken, resetExpires);

    // Send reset email
    // await localAuthService.sendPasswordResetEmail(email, resetToken);

    logger.info("Password reset email sent", { userId: user._id });
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
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    logger.info("Password reset attempt", { token: req.params.token });
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      logger.warn("Password reset failed: No password provided");
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    const user = await localAuthService.resetPassword(token, password);
    if (!user) {
      logger.warn("Password reset failed: Invalid or expired token", { token });
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    logger.info("Password reset successful", { userId: user._id });
    res.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    logger.error("Reset password error:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
