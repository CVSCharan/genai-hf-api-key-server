const User = require("../models/User");
const logger = require("../utils/logger");
const nodemailer = require("nodemailer");

let transporter = null;

// Initialize the transporter
const initializeTransporter = () => {
  // Check if we have the required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.error("Email configuration is incomplete. Check your .env file.");
    throw new Error("Email configuration is incomplete. Check your .env file.");
  }

  // Create the transporter with more detailed configuration
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true" || false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true, // Enable debug output
  });

  // Verify the connection
  transporter.verify(function (error, success) {
    if (error) {
      logger.error(`Email Service: SMTP connection error - ${error.message}`);
    } else {
      logger.info(
        "Email Service: SMTP server connection established successfully"
      );
    }
  });
};

// Find user by email
exports.findUserByEmail = async (email) => {
  try {
    logger.debug("Finding user by email", { email });
    return await User.findOne({ email });
  } catch (error) {
    logger.error("Error finding user by email:", {
      error: error.message,
      email,
    });
    throw error;
  }
};

// Create new user
exports.createUser = async (userData) => {
  try {
    logger.debug("Creating new user", { email: userData.email });
    return await User.create(userData);
  } catch (error) {
    logger.error("Error creating user:", {
      error: error.message,
      email: userData.email,
    });
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
    logger.error("Error setting reset token:", {
      error: error.message,
      userId,
    });
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

    // Initialize transporter if not already done
    if (!transporter) {
      initializeTransporter();
    }

    // Create verification URL
    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email/${token}`;

    // Email content
    const mailOptions = {
      from: `"CVS GenAI Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Thank you for registering with CVS GenAI Aplatform. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info("Verification email sent successfully", {
      email,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error("Error sending verification email:", {
      error: error.message,
      email,
    });
    throw error;
  }
};

// Send password reset email (placeholder - implement with your email service)
// Send password reset email
exports.sendPasswordResetEmail = async (email, token) => {
  try {
    logger.debug("Sending password reset email", { email });

    // Initialize transporter if not already done
    if (!transporter) {
      initializeTransporter();
    }

    // Create reset password URL
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password/${token}`;

    // Email content
    const mailOptions = {
      from: `"CVS GenAI Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your CVS GenAI Platform account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info("Password reset email sent successfully", {
      email,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error("Error sending reset email:", { error: error.message, email });
    throw error;
  }
};
