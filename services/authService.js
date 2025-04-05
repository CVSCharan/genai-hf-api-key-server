const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailService");

// Google OAuth
exports.getGoogleAuthUrl = () => {
  logger.info("Generating Google OAuth URL");
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
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("Google OAuth URL generated with options", {
    redirect_uri: options.redirect_uri,
  });
  return `${rootUrl}?${queryString}`;
};

// Update these methods in your existing authService.js

exports.handleGoogleCallback = async (code, isRegistration = false) => {
  logger.info("Handling Google OAuth callback", { isRegistration });
  
  // Get tokens
  logger.debug("Requesting Google tokens with auth code");
  const { id_token, access_token } = await getGoogleTokens(code);
  
  // Get user with tokens
  logger.debug("Fetching Google user profile");
  const googleUser = await getGoogleUser(id_token, access_token);
  
  if (!googleUser.verified_email) {
    logger.warn("Unverified Google account attempted login", { email: googleUser.email });
    throw new Error("Google account not verified");
  }
  
  // Check if user exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: googleUser.email },
      { providerId: googleUser.sub, provider: "google" }
    ]
  });
  
  // If this is a registration attempt and user exists, throw error
  if (isRegistration && existingUser) {
    logger.warn("Registration failed: User already exists", { email: googleUser.email });
    throw new Error("User with this email already exists");
  }
  
  // If this is a login attempt and user doesn't exist, throw error
  if (!isRegistration && !existingUser) {
    logger.warn("Login failed: User doesn't exist", { email: googleUser.email });
    throw new Error("No account found with this Google account. Please register first.");
  }
  
  // Upsert user
  logger.info("Upserting user from Google profile", { email: googleUser.email });
  const user = await upsertUser({
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    provider: "google",
    providerId: googleUser.sub,
    isVerified: true
  });
  
  // Create JWT token
  logger.debug("Creating JWT token for authenticated user", { userId: user._id });
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  logger.info("Google authentication successful", { userId: user._id });
  return { user, token };
};

exports.handleGithubCallback = async (code, isRegistration = false) => {
  logger.info("Handling GitHub OAuth callback", { isRegistration });
  
  // Get token
  logger.debug("Requesting GitHub access token with auth code");
  const token = await getGithubToken(code);
  
  // Get user with token
  logger.debug("Fetching GitHub user profile");
  const githubUser = await getGithubUser(token);
  
  // Get user email
  logger.debug("Fetching GitHub user emails");
  const emails = await getGithubUserEmails(token);
  const primaryEmail = emails.find(email => email.primary)?.email;
  
  if (!primaryEmail) {
    logger.warn("No primary email found for GitHub user", { userId: githubUser.id });
    throw new Error("No primary email found");
  }
  
  // Check if user exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: primaryEmail },
      { providerId: githubUser.id.toString(), provider: "github" }
    ]
  });
  
  // If this is a registration attempt and user exists, throw error
  if (isRegistration && existingUser) {
    logger.warn("Registration failed: User already exists", { email: primaryEmail });
    throw new Error("User with this email already exists");
  }
  
  // If this is a login attempt and user doesn't exist, throw error
  if (!isRegistration && !existingUser) {
    logger.warn("Login failed: User doesn't exist", { email: primaryEmail });
    throw new Error("No account found with this GitHub account. Please register first.");
  }
  
  // Upsert user
  logger.info("Upserting user from GitHub profile", { email: primaryEmail });
  const user = await upsertUser({
    email: primaryEmail,
    name: githubUser.name || githubUser.login,
    picture: githubUser.avatar_url,
    provider: "github",
    providerId: githubUser.id.toString(),
    isVerified: true
  });
  
  // Create JWT token
  logger.debug("Creating JWT token for authenticated user", { userId: user._id });
  const jwtToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  logger.info("GitHub authentication successful", { userId: user._id });
  return { user, token: jwtToken };
};

// Local authentication
exports.registerUser = async (name, email, password) => {
  logger.info("Registering new user", { email });

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn("Registration failed: Email already in use", { email });
    throw new Error("Email already in use");
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    provider: "local",
    verificationToken,
    isVerified: false,
  });

  // Send verification email
  const verificationUrl = `${
    process.env.API_URL || "http://localhost:4040/api/v1"
  }/auth/verify/${verificationToken}`;

  try {
    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      html: `<p>Please verify your email by clicking on the following link: <a href="${verificationUrl}">Verify Email</a></p>`,
    });

    logger.info("Verification email sent", { email });
  } catch (error) {
    logger.error("Error sending verification email", {
      error: error.message,
      email,
    });
    // Continue with registration even if email fails
  }

  logger.info("User registered successfully", { userId: user._id });
  return { user };
};

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
    logger.warn("Login failed: User registered with OAuth", {
      email,
      provider: user.provider,
    });
    throw new Error(
      `This account uses ${user.provider} authentication. Please sign in with ${user.provider}.`
    );
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

exports.verifyEmail = async (token) => {
  logger.info("Verifying email with token");

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    logger.warn("Email verification failed: Invalid token");
    throw new Error("Invalid verification token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  logger.info("Email verified successfully", { userId: user._id });
  return { user };
};

exports.forgotPassword = async (email) => {
  logger.info("Processing forgot password request", { email });

  const user = await User.findOne({ email });
  if (!user || user.provider !== "local") {
    // Don't reveal if user exists for security
    logger.info("Forgot password requested for non-existent or OAuth user", {
      email,
    });
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetTokenExpiry;
  await user.save();

  // Send reset email
  const resetUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: email,
      subject: "Password Reset",
      text: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}. This link is valid for 1 hour.`,
      html: `<p>You requested a password reset. Please click on the following link to reset your password: <a href="${resetUrl}">Reset Password</a>. This link is valid for 1 hour.</p>`,
    });

    logger.info("Password reset email sent", { email });
  } catch (error) {
    logger.error("Error sending password reset email", {
      error: error.message,
      email,
    });
    throw new Error("Error sending password reset email");
  }
};

exports.resetPassword = async (token, password) => {
  logger.info("Resetting password with token");

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
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

// Helper functions
async function getGoogleTokens(code) {
  const url = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  };

  try {
    logger.debug("Requesting tokens from Google OAuth API");
    const response = await axios.post(
      url,
      new URLSearchParams(values).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    logger.debug("Google tokens received successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting Google tokens:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error("Failed to get Google tokens");
  }
}

async function getGoogleUser(id_token, access_token) {
  try {
    logger.debug("Fetching user info from Google API");
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );
    logger.debug("Google user info retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting Google user:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error("Failed to get Google user info");
  }
}

async function getGithubToken(code) {
  const url = "https://github.com/login/oauth/access_token";
  const values = {
    code,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
  };

  try {
    logger.debug("Requesting access token from GitHub OAuth API");
    const response = await axios.post(url, values, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    logger.debug("GitHub access token received successfully");
    return response.data.access_token;
  } catch (error) {
    logger.error("Error getting GitHub token:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error("Failed to get GitHub token");
  }
}

async function getGithubUser(token) {
  try {
    logger.debug("Fetching user info from GitHub API");
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    logger.debug("GitHub user info retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting GitHub user:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error("Failed to get GitHub user info");
  }
}

async function getGithubUserEmails(token) {
  try {
    logger.debug("Fetching user emails from GitHub API");
    const response = await axios.get("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    logger.debug("GitHub user emails retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting GitHub user emails:", {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error("Failed to get GitHub user emails");
  }
}

async function upsertUser(userData) {
  try {
    logger.debug("Upserting user in database", { email: userData.email });

    // Check if user exists
    let user = await User.findOne({ email: userData.email });

    if (user) {
      // If user exists but with different provider, update provider info
      if (user.provider !== userData.provider) {
        logger.info(
          "User exists with different provider, updating provider info",
          {
            email: userData.email,
            oldProvider: user.provider,
            newProvider: userData.provider,
          }
        );
      }

      // Update user
      Object.assign(user, userData);
      user.updatedAt = new Date();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.debug("User upserted successfully", { userId: user._id });
    return user;
  } catch (error) {
    logger.error("Error upserting user:", {
      error: error.message,
      stack: error.stack,
      userData: { email: userData.email, provider: userData.provider },
    });
    throw new Error("Failed to create or update user");
  }
}
