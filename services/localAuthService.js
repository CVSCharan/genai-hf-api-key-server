const User = require("../models/User");
const logger = require("../utils/logger");

// Find user by email
exports.findUserByEmail = async (email) => {
  try {
    logger.debug("Finding user by email", { email });
    return await User.findOne({ email });
  } catch (error) {
    logger.error("Error finding user by email:", { error: error.message, email });
    throw error;
  }
};

// Create new user
exports.createUser = async (userData) => {
  try {
    logger.debug("Creating new user", { email: userData.email });
    return await User.create(userData);
  } catch (error) {
    logger.error("Error creating user:", { error: error.message, email: userData.email });
    throw error;
  }
};

// Verify email
exports.verifyEmail = async (token) => {
  try {
    logger.debug("Verifying email with token");
    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      logger.warn("No user found with verification token");
      return null;
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    
    logger.debug("Email verified successfully", { userId: user._id });
    return user;
  } catch (error) {
    logger.error("Error verifying email:", { error: error.message });
    throw error;
  }
};

// Set password reset token
exports.setResetToken = async (userId, token, expires) => {
  try {
    logger.debug("Setting password reset token", { userId });
    await User.findByIdAndUpdate(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  } catch (error) {
    logger.error("Error setting reset token:", { error: error.message, userId });
    throw error;
  }
};

// Reset password
exports.resetPassword = async (token, newPassword) => {
  try {
    logger.debug("Resetting password with token");
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      logger.warn("No user found with valid reset token");
      return null;
    }
    
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    logger.debug("Password reset successfully", { userId: user._id });
    return user;
  } catch (error) {
    logger.error("Error resetting password:", { error: error.message });
    throw error;
  }
};

// Send verification email (placeholder - implement with your email service)
exports.sendVerificationEmail = async (email, token) => {
  try {
    logger.debug("Sending verification email", { email });
    // Implement email sending logic here
    // This is a placeholder for your actual email sending implementation
    logger.info(`VERIFICATION EMAIL to ${email}: Verify your account with token: ${token}`);
  } catch (error) {
    logger.error("Error sending verification email:", { error: error.message, email });
    throw error;
  }
};

// Send password reset email (placeholder - implement with your email service)
exports.sendPasswordResetEmail = async (email, token) => {
  try {
    logger.debug("Sending password reset email", { email });
    // Implement email sending logic here
    // This is a placeholder for your actual email sending implementation
    logger.info(`RESET EMAIL to ${email}: Reset your password with token: ${token}`);
  } catch (error) {
    logger.error("Error sending reset email:", { error: error.message, email });
    throw error;
  }
};