const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailService");

// Login user with email and password
exports.loginUser = async (email, password) => {
  logger.info("Attempting user login", { email });
  
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn("Login failed: User not found", { email });
    throw new Error("Invalid credentials");
  }
  
  // Check if user is using OAuth
  if (user.provider !== "local") {
    logger.warn("Login failed: User registered with OAuth", { email, provider: user.provider });
    throw new Error(`This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`);
  }
  
  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    logger.warn("Login failed: Invalid password", { email });
    throw new Error("Invalid credentials");
  }
  
  // Check if user is verified
  if (!user.isVerified) {
    logger.warn("Login failed: Email not verified", { email });
    throw new Error("Please verify your email before logging in");
  }
  
  // Create token
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  logger.info("User logged in successfully", { userId: user._id });
  return { user, token };
};

// Get Google OAuth URL for login
exports.getGoogleAuthUrl = () => {
  logger.info("Generating Google OAuth URL for login");
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state: "login" // Indicate this is a login attempt
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("Google OAuth URL generated for login", { redirect_uri: options.redirect_uri });
  return `${rootUrl}?${queryString}`;
};

// Get GitHub OAuth URL for login
exports.getGithubAuthUrl = () => {
  logger.info("Generating GitHub OAuth URL for login");
  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "user:email",
    state: "login" // Indicate this is a login attempt
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("GitHub OAuth URL generated for login", { redirect_uri: options.redirect_uri });
  return `${rootUrl}?${queryString}`;
};

// Forgot password
exports.forgotPassword = async (email) => {
  logger.info("Processing forgot password request", { email });
  
  const user = await User.findOne({ email });
  if (!user || user.provider !== "local") {
    // Don't reveal if user exists for security
    logger.info("Forgot password requested for non-existent or OAuth user", { email });
    return;
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour
  
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetTokenExpiry;
  await user.save();
  
  // Send reset email
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
  
  try {
    await sendEmail({
      to: email,
      subject: "Password Reset",
      text: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}. This link is valid for 1 hour.`,
      html: `<p>You requested a password reset. Please click on the following link to reset your password: <a href="${resetUrl}">Reset Password</a>. This link is valid for 1 hour.</p>`
    });
    
    logger.info("Password reset email sent", { email });
  } catch (error) {
    logger.error("Error sending password reset email", { error: error.message, email });
    throw new Error("Error sending password reset email");
  }
};

// Reset password
exports.resetPassword = async (token, password) => {
  logger.info("Resetting password with token");
  
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    logger.warn("Password reset failed: Invalid or expired token");
    throw new Error("Invalid or expired reset token");
  }
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  
  logger.info("Password reset successful", { userId: user._id });
  return { user };
};

// Set password for OAuth user
exports.setPasswordForOAuthUser = async (userId, password) => {
  logger.info("Setting password for OAuth user", { userId });
  
  // Get user
  const user = await User.findById(userId);
  
  if (!user) {
    logger.warn("User not found when setting password", { userId });
    throw new Error("User not found");
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Update user
  user.password = hashedPassword;
  await user.save();
  
  logger.info("Password set successfully for OAuth user", { userId });
  return { user };
};